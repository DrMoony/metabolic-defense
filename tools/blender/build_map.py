"""Blender로 맵 플레이트를 짓고, 배경 그림·카메라·몬스터 경로를 한 좌표계에서 함께 내보낸다.

지금까지는 그림을 먼저 그리고 길을 눈으로 따라 찍었기 때문에 원근이 조금만 어긋나도
몬스터가 길이 아니라 절벽을 걸었다. 여기서는 길이 먼저 있고 그림이 그 길을 렌더한
결과이므로, 내보낸 경로는 정의상 그림 위의 길과 정확히 겹친다.

좌표 규약
  게임(three.js)은 Y-up, 카메라는 (0, height, 20)에서 (0, 0, targetZ)를 본다.
  Blender는 Z-up이므로 three (x, y, z) → blender (x, -z, y) 로 옮긴다.
  경로는 화면 정규 좌표(0~1, 좌상단 원점)로 내보내며 게임의 groundPoint()가 그대로 되짚는다.

사용법
  Blender --background --python build_map.py -- <스펙.json>
"""
import bpy, bmesh, json, math, os, random, sys
from mathutils import Vector, Matrix

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
W, H = 1672, 941


# ---------- 좌표 변환 ----------
def to_blender(p):
    """three.js (x, y, z) → blender (x, -z, y)"""
    x, y, z = p
    return Vector((x, -z, y))


def screen_to_ground(spec, sx, sy):
    """화면 정규 좌표(0~1, 좌상단) → 게임 바닥면 위의 three 좌표 (x, z).

    게임의 groundPoint()와 같은 계산이다. 길을 화면에서 보고 싶은 대로 그린 뒤
    월드로 되돌리면, 렌더한 그림과 경로가 처음부터 같은 자리에 놓인다.
    """
    fov = math.radians(spec['camera']['fov'])
    aspect = W / H
    eye = Vector((0.0, spec['camera']['height'], 20.0))
    target = Vector((0.0, 0.0, spec['camera']['targetZ']))
    forward = (target - eye).normalized()
    right = forward.cross(Vector((0.0, 1.0, 0.0))).normalized()
    up = right.cross(forward).normalized()
    ndc_x, ndc_y = sx * 2 - 1, 1 - sy * 2
    half_h = math.tan(fov / 2)
    direction = (forward + right * (ndc_x * half_h * aspect) + up * (ndc_y * half_h)).normalized()
    if direction.y >= -1e-4:
        raise ValueError('지평선 위의 점은 바닥에 닿지 않는다')
    t = -eye.y / direction.y
    hit = eye + direction * t
    return (hit.x, hit.z)


def ground(x, z, y=0.0):
    """게임 바닥면(y=0) 위의 점"""
    return to_blender((x, y, z))


# ---------- 씬 기본 ----------
def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    names = [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties['view_transform'].enum_items]
    for want in ('AgX', 'Filmic', 'Standard'):
        if want in names:
            scene.view_settings.view_transform = want
            break
    looks = [v.identifier for v in bpy.types.ColorManagedViewSettings.bl_rna.properties['look'].enum_items]
    for want in ('AgX - Medium High Contrast', 'Medium High Contrast', 'High Contrast'):
        if want in looks:
            scene.view_settings.look = want
            break
    scene.view_settings.exposure = -0.2
    try:
        scene.eevee.taa_render_samples = 64
        scene.eevee.use_raytracing = True
    except Exception:
        pass
    return scene


def make_camera(scene, spec):
    cam_data = bpy.data.cameras.new('plate-cam')
    cam_data.sensor_fit = 'VERTICAL'
    cam_data.angle_y = math.radians(spec['camera']['fov'])
    cam_data.clip_start, cam_data.clip_end = 0.1, 1500.0
    cam = bpy.data.objects.new('plate-cam', cam_data)
    scene.collection.objects.link(cam)
    loc = to_blender((0.0, spec['camera']['height'], 20.0))
    target = to_blender((0.0, 0.0, spec['camera']['targetZ']))
    cam.location = loc
    cam.rotation_euler = (target - loc).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    return cam


# ---------- 재질 ----------
def material(name, base, rough=0.35, subsurface=0.0, emission=None, emission_strength=1.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*base, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    for key, value in (('Subsurface Weight', subsurface), ('Coat Weight', 0.25)):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value
    if 'Subsurface Radius' in bsdf.inputs:
        bsdf.inputs['Subsurface Radius'].default_value = (1.2, 0.45, 0.35)
    if emission and 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat


def organic_material(name, base, tip, rough=0.30, subsurface=0.45, variation=0.12, seed=0.0):
    """밑동은 짙고 끝은 밝은 유기체 재질. 노이즈로 개체마다 색을 살짝 흔든다."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    rng = nt.nodes.new('ShaderNodeMapRange')
    rng.inputs['From Min'].default_value = -1.0
    rng.inputs['From Max'].default_value = 1.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.05
    ramp.color_ramp.elements[0].color = (*base, 1.0)
    ramp.color_ramp.elements[1].position = 0.92
    ramp.color_ramp.elements[1].color = (*tip, 1.0)
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 2.4
    noise.inputs['Detail'].default_value = 4.0
    try:
        noise.noise_dimensions = '4D'
        noise.inputs['W'].default_value = seed
    except Exception:
        noise.inputs['Scale'].default_value = 2.4 + seed * 0.3
    mix = nt.nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'OVERLAY'
    mix.inputs['Fac'].default_value = variation
    nt.links.new(coord.outputs['Object'], sep.inputs['Vector'])
    nt.links.new(sep.outputs['Z'], rng.inputs['Value'])
    nt.links.new(rng.outputs['Result'], ramp.inputs['Fac'])
    nt.links.new(coord.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(ramp.outputs['Color'], mix.inputs[1])
    nt.links.new(noise.outputs['Color'], mix.inputs[2])
    nt.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    # 잔주름: 노이즈 두 겹을 범프로 물려 표면에 결을 준다
    fine = nt.nodes.new('ShaderNodeTexNoise')
    fine.inputs['Scale'].default_value = 26.0
    fine.inputs['Detail'].default_value = 8.0
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.28
    bump.inputs['Distance'].default_value = 0.06
    nt.links.new(coord.outputs['Object'], fine.inputs['Vector'])
    nt.links.new(fine.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    rough_ramp = nt.nodes.new('ShaderNodeMapRange')
    rough_ramp.inputs['To Min'].default_value = rough * 0.75
    rough_ramp.inputs['To Max'].default_value = rough * 1.45
    nt.links.new(fine.outputs['Fac'], rough_ramp.inputs['Value'])
    nt.links.new(rough_ramp.outputs['Result'], bsdf.inputs['Roughness'])
    for key, value in (('Subsurface Weight', subsurface), ('Coat Weight', 0.45), ('Coat Roughness', 0.18)):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value
    if 'Subsurface Radius' in bsdf.inputs:
        bsdf.inputs['Subsurface Radius'].default_value = (1.6, 0.5, 0.38)
    if 'Subsurface Scale' in bsdf.inputs:
        bsdf.inputs['Subsurface Scale'].default_value = 0.6
    return mat


def road_material(name, base, glow, rough=0.24):
    """젖은 길: 미세 반사 + 가운데로 갈수록 은은한 발광."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    coord = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 14.0
    noise.inputs['Detail'].default_value = 6.0
    mix = nt.nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'OVERLAY'
    mix.inputs['Fac'].default_value = 0.10
    mix.inputs[1].default_value = (*base, 1.0)
    nt.links.new(coord.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Color'], mix.inputs[2])
    nt.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = rough
    for key, value in (('Coat Weight', 0.6), ('Coat Roughness', 0.08), ('Specular IOR Level', 0.6)):
        if key in bsdf.inputs:
            bsdf.inputs[key].default_value = value
    if glow and 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (*glow, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 0.25
    return mat


# ---------- 길 ----------
def road_curve(name, points, width, lift=0.02):
    """three 좌표 점렬을 받아 리본 도로를 만든다."""
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.resolution_u = 12
    spline = curve.splines.new('NURBS')
    spline.points.add(len(points) - 1)
    for i, p in enumerate(points):
        b = ground(p[0], p[1], lift)
        spline.points[i].co = (b.x, b.y, b.z, 1.0)
    spline.use_endpoint_u = True
    spline.order_u = min(4, len(points))

    profile = bpy.data.curves.new(name + '-profile', 'CURVE')
    profile.dimensions = '2D'
    pspline = profile.splines.new('POLY')
    half = width / 2
    shape = [(-half, 0.0), (-half * 0.94, 0.16), (half * 0.94, 0.16), (half, 0.0)]
    pspline.points.add(len(shape) - 1)
    for i, (x, y) in enumerate(shape):
        pspline.points[i].co = (x, y, 0.0, 1.0)
    curve.bevel_mode = 'OBJECT'
    curve.bevel_object = bpy.data.objects.new(name + '-profile', profile)
    bpy.context.scene.collection.objects.link(curve.bevel_object)
    curve.bevel_object.hide_render = True

    obj = bpy.data.objects.new(name, curve)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def sample_road(points, count):
    """도로 중심선을 균등 길이로 재표본한다 (three 좌표)."""
    import numpy as np
    pts = np.array(points, dtype=float)
    # Catmull-Rom 유사 보간을 위해 조밀 샘플 후 호길이 재분배
    dense = []
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        for t in np.linspace(0, 1, 24, endpoint=False):
            dense.append(a * (1 - t) + b * t)
    dense.append(pts[-1])
    dense = np.array(dense)
    seg = np.hypot(*np.diff(dense, axis=0).T)
    cum = np.concatenate([[0], np.cumsum(seg)])
    out = []
    for t in np.linspace(0, cum[-1], count):
        x = np.interp(t, cum, dense[:, 0])
        z = np.interp(t, cum, dense[:, 1])
        out.append((float(x), float(z)))
    return out


def world_points(spec, route):
    """스펙의 경로가 screen 이면 화면 좌표를, world 면 월드 좌표를 그대로 쓴다."""
    if route.get('space', 'screen') == 'world':
        return route['points']
    return [screen_to_ground(spec, sx, sy) for sx, sy in route['points']]


def road_screen_points(scene, cam, world_pts):
    """길의 화면 좌표와 카메라 거리. 가림 판정에 쓴다."""
    out = []
    for x, z in world_pts:
        p = ground(x, z)
        sx, sy = project(scene, cam, p)
        out.append((sx, sy, (p - cam.location).length))
    return out


def occludes_road(scene, cam, road_screen, cx, cz, radius, height):
    """이 덩어리가 자기보다 먼 길 구간을 화면에서 덮는지."""
    base = ground(cx, cz)
    dist = (base - cam.location).length
    bx, by = project(scene, cam, base)
    tx, ty = project(scene, cam, ground(cx, cz, height))
    lx, _ = project(scene, cam, ground(cx + radius, cz))
    rx, _ = project(scene, cam, ground(cx - radius, cz))
    half = max(abs(lx - bx), abs(rx - bx)) * 1.05
    top, bottom = min(ty, by), max(ty, by)
    for sx, sy, sd in road_screen:
        if sd <= dist:
            continue                      # 덩어리보다 가까운 길은 가려지지 않는다
        if abs(sx - bx) < half and top - .01 < sy < bottom + .01:
            return True
    return False


# ---------- 지형 ----------
def organic_blob(name, location, scale, mat, seed=0, rough=0.11):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=1.0, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    rng = random.Random(seed)
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    for v in mesh.verts:
        v.co += v.co.normalized() * rng.uniform(-rough, rough * 1.3)
    mesh.to_mesh(obj.data)
    mesh.free()
    obj.data.materials.append(mat)
    sub = obj.modifiers.new('smooth', 'SUBSURF')
    sub.levels = 1
    sub.render_levels = 2
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


def build_walls(spec, world_pts, mats, scene=None, cam=None, road_screen=None):
    """길 옆으로 월드 여유를 두고 세운다. 길 반폭 + 덩어리 반지름 + 여백을 확보한다."""
    rng = random.Random(spec.get('seed', 7))
    cfg = spec['walls']
    half = spec['road']['width'] / 2 + spec['road']['curb'] / 2
    made = []
    for i in range(0, len(world_pts), cfg.get('step', 2)):
        x, z = world_pts[i]
        nx, nz = world_pts[min(i + 1, len(world_pts) - 1)]
        tx, tz = nx - x, nz - z
        length = math.hypot(tx, tz) or 1e-6
        px, pz = -tz / length, tx / length
        for side in (-1, 1):
            for lane in range(cfg.get('lanes', 3)):
                radius = rng.uniform(*cfg['size'])
                gap = half + cfg['margin'] + radius + lane * cfg['spread'] + rng.uniform(-.6, .6)
                cx, cz = x + px * side * gap, z + pz * side * gap
                height = radius * rng.uniform(*cfg.get('height', [1.6, 2.8]))
                if rng.random() < cfg.get('tall_chance', .22):
                    height *= rng.uniform(1.35, 1.8)
                mat = mats['wall'] if lane == 0 else (mats['wall_mid'] if lane == 1 else mats['wall_far'])
                # 길을 가리면 낮추고, 그래도 가리면 세우지 않는다 (플레이어가 쏠 수 있어야 한다)
                if road_screen is not None:
                    for _ in range(4):
                        if not occludes_road(scene, cam, road_screen, cx, cz, radius, height):
                            break
                        height *= 0.62
                    else:
                        continue
                    if height < radius * 0.7:
                        continue
                blob = organic_blob(f'w{i}-{side}-{lane}',
                                    ground(cx, cz, height * 0.5),
                                    (radius, radius * rng.uniform(.85, 1.15), height),
                                    mat, seed=i * 31 + side * 7 + lane)
                blob.rotation_euler = (rng.uniform(-.12, .12), rng.uniform(-.12, .12), rng.uniform(0, 6.28))
                made.append(blob)
    return made


def build_detail(spec, world_pts, mats):
    """길가에 작은 알갱이를 흩어 밀도를 준다."""
    rng = random.Random(spec.get('seed', 7) + 99)
    cfg = spec.get('detail')
    if not cfg:
        return []
    half = spec['road']['width'] / 2 + spec['road']['curb'] / 2
    made = []
    for i in range(0, len(world_pts), cfg.get('step', 3)):
        x, z = world_pts[i]
        nx, nz = world_pts[min(i + 1, len(world_pts) - 1)]
        tx, tz = nx - x, nz - z
        length = math.hypot(tx, tz) or 1e-6
        px, pz = -tz / length, tx / length
        for _ in range(cfg.get('count', 2)):
            side = rng.choice((-1, 1))
            gap = half + cfg['margin'] + rng.uniform(0, cfg['spread'])
            cx, cz = x + px * side * gap, z + pz * side * gap
            r = cfg['size'] * rng.uniform(.7, 1.3)
            made.append(organic_blob(f'd{i}-{side}-{rng.randint(0,9999)}',
                                     ground(cx, cz, r * 0.5),
                                     (r, r, r * rng.uniform(.9, 1.6)),
                                     mats['detail'], seed=rng.randint(0, 9999), rough=0.16))
    return made


def build_arches(spec, world_pts, mats, scene, cam):
    """길 위를 가로지르는 모세혈관 아치. 얇아서 길을 가리지 않으면서 깊이를 만든다."""
    cfg = spec.get('arches')
    if not cfg:
        return []
    rng = random.Random(spec.get('seed', 7) + 41)
    made = []
    for i in range(cfg.get('start', 8), len(world_pts) - 4, cfg.get('step', 18)):
        x, z = world_pts[i]
        nx, nz = world_pts[min(i + 1, len(world_pts) - 1)]
        tx, tz = nx - x, nz - z
        length = math.hypot(tx, tz) or 1e-6
        span = spec['road']['width'] * rng.uniform(1.5, 2.1)
        radius = span / 2
        bpy.ops.mesh.primitive_torus_add(major_radius=radius, minor_radius=cfg.get('thickness', .38),
                                         major_segments=44, minor_segments=10,
                                         location=ground(x, z, 0))
        arch = bpy.context.active_object
        arch.name = f'arch{i}'
        arch.rotation_euler = (math.pi / 2, 0, math.atan2(tz, tx))
        arch.scale = (1.0, rng.uniform(.85, 1.15), 1.0)
        arch.data.materials.append(mats['arch'])
        for poly in arch.data.polygons:
            poly.use_smooth = True
        made.append(arch)
    return made


def build_droplets(spec, world_pts, mats):
    """영양 방울: 길가에 흩어진 작은 발광 구슬."""
    cfg = spec.get('droplets')
    if not cfg:
        return []
    rng = random.Random(spec.get('seed', 7) + 77)
    half = spec['road']['width'] / 2
    made = []
    for i in range(0, len(world_pts), cfg.get('step', 7)):
        x, z = world_pts[i]
        nx, nz = world_pts[min(i + 1, len(world_pts) - 1)]
        tx, tz = nx - x, nz - z
        length = math.hypot(tx, tz) or 1e-6
        px, pz = -tz / length, tx / length
        for _ in range(cfg.get('count', 3)):
            side = rng.choice((-1, 1))
            gap = rng.uniform(half * .35, half + cfg.get('spread', 2.4))
            r = cfg.get('size', .42) * rng.uniform(.6, 1.5)
            bpy.ops.mesh.primitive_uv_sphere_add(radius=r, segments=16, ring_count=10,
                                                 location=ground(x + px * side * gap, z + pz * side * gap, r * .85))
            drop = bpy.context.active_object
            drop.name = f'drop{i}-{side}'
            drop.data.materials.append(mats['droplet'])
            for poly in drop.data.polygons:
                poly.use_smooth = True
            made.append(drop)
    return made


def build_pools(spec, mats):
    """바닥에 고인 점액 웅덩이. 평평한 바닥에 얼룩을 준다."""
    cfg = spec.get('pools')
    if not cfg:
        return []
    rng = random.Random(spec.get('seed', 7) + 13)
    made = []
    for n in range(cfg.get('count', 14)):
        sx = rng.uniform(.05, .95)
        sy = rng.uniform(.30, .99)
        try:
            wx, wz = screen_to_ground(spec, sx, sy)
        except ValueError:
            continue
        r = cfg.get('size', 5.0) * rng.uniform(.5, 1.7)
        bpy.ops.mesh.primitive_circle_add(vertices=26, radius=r, fill_type='NGON',
                                          location=ground(wx, wz, 0.03))
        pool = bpy.context.active_object
        pool.name = f'pool{n}'
        pool.scale = (1.0, rng.uniform(.55, 1.0), 1.0)
        pool.rotation_euler = (0, 0, rng.uniform(0, 6.28))
        pool.data.materials.append(mats['pool'])
        made.append(pool)
    return made


def build_backdrop(spec, mats):
    """원경에 큰 융모 실루엣을 세워 안개 속 깊이를 만든다."""
    cfg = spec.get('backdrop')
    if not cfg:
        return []
    rng = random.Random(spec.get('seed', 7) + 5)
    made = []
    for n in range(cfg.get('count', 26)):
        sx = rng.uniform(-.05, 1.05)
        sy = rng.uniform(cfg.get('band', [.14, .22])[0], cfg.get('band', [.14, .22])[1])
        try:
            wx, wz = screen_to_ground(spec, sx, sy)
        except ValueError:
            continue
        r = cfg.get('size', 9.0) * rng.uniform(.6, 1.6)
        h = r * rng.uniform(2.0, 3.6)
        blob = organic_blob(f'back{n}', ground(wx, wz, h * .5), (r, r * rng.uniform(.8, 1.2), h),
                            mats['wall_far'], seed=900 + n, rough=0.08)
        blob.rotation_euler = (rng.uniform(-.08, .08), rng.uniform(-.08, .08), rng.uniform(0, 6.28))
        made.append(blob)
    return made


def build_floor(spec, mats):
    bpy.ops.mesh.primitive_plane_add(size=900)
    floor = bpy.context.active_object
    floor.name = 'floor'
    floor.data.materials.append(mats['floor'])
    return floor


# ---------- 조명 ----------
def build_lights(spec):
    world = bpy.data.worlds.new('plate-world')
    bpy.context.scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (*spec['palette']['sky'], 1.0)
    bg.inputs['Strength'].default_value = spec['palette'].get('sky_strength', 1.1)

    key = bpy.data.lights.new('key', 'AREA')
    key.energy = spec['light']['key_energy']
    key.size = 40
    key.color = spec['palette']['key']
    key_obj = bpy.data.objects.new('key', key)
    bpy.context.scene.collection.objects.link(key_obj)
    key_obj.location = ground(-40, -30, 55)
    key_obj.rotation_euler = (ground(0, -20, 0) - key_obj.location).to_track_quat('-Z', 'Y').to_euler()

    rim = bpy.data.lights.new('rim', 'AREA')
    rim.energy = spec['light']['rim_energy']
    rim.size = 60
    rim.color = spec['palette']['rim']
    rim_obj = bpy.data.objects.new('rim', rim)
    bpy.context.scene.collection.objects.link(rim_obj)
    rim_obj.location = ground(30, -120, 40)
    rim_obj.rotation_euler = (ground(0, -40, 0) - rim_obj.location).to_track_quat('-Z', 'Y').to_euler()

    fill = bpy.data.lights.new('fill', 'AREA')
    fill.energy = spec['light'].get('fill_energy', 18000)
    fill.size = 80
    fill.color = spec['palette'].get('fill', [0.72, 0.55, 0.85])
    fill_obj = bpy.data.objects.new('fill', fill)
    bpy.context.scene.collection.objects.link(fill_obj)
    fill_obj.location = ground(50, -10, 34)
    fill_obj.rotation_euler = (ground(0, -25, 0) - fill_obj.location).to_track_quat('-Z', 'Y').to_euler()


def build_mist(scene, spec):
    """월드 볼륨으로 원경을 뿌옇게 만든다 (Blender 5의 컴포지터 API 변경을 피한다)."""
    world = scene.world
    tree = world.node_tree
    scatter = tree.nodes.new('ShaderNodeVolumeScatter')
    scatter.inputs['Color'].default_value = (*spec['palette']['haze'], 1.0)
    scatter.inputs['Density'].default_value = spec['mist'].get('density', 0.0035)
    if 'Anisotropy' in scatter.inputs:
        scatter.inputs['Anisotropy'].default_value = 0.35
    output = next(n for n in tree.nodes if n.type == 'OUTPUT_WORLD')
    tree.links.new(scatter.outputs['Volume'], output.inputs['Volume'])
    for attr, value in (('volumetric_start', 8.0), ('volumetric_end', 400.0),
                        ('volumetric_samples', 64), ('use_volumetric_shadows', True)):
        try:
            setattr(scene.eevee, attr, value)
        except Exception:
            pass


# ---------- 내보내기 ----------
def project(scene, cam, point3):
    from bpy_extras.object_utils import world_to_camera_view
    co = world_to_camera_view(scene, cam, point3)
    return [round(co.x, 5), round(1 - co.y, 5)]     # 좌상단 원점


def export_routes(scene, cam, spec, road_pts):
    doc = {
        'key': spec['key'],
        'camera': spec['camera'],
        'routes': [],
        'meta': {'note': 'normalized-screen, origin top-left, produced by Blender'},
    }
    for route in spec['routes']:
        pts = sample_road(world_points(spec, route), route.get('count', 26))
        doc['routes'].append({
            'id': route['id'],
            'names': route['names'],
            'points': [project(scene, cam, ground(x, z)) for x, z in pts],
            'world': [[round(x, 3), round(z, 3)] for x, z in pts],
        })
    for name, at in spec.get('organs', {}).items():
        doc.setdefault('organs', {})[name] = [round(at[0], 5), round(at[1], 5)]
    return doc


# ---------- 메인 ----------
def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    spec_path = argv[0]
    spec = json.load(open(spec_path))

    scene = reset_scene()
    cam = make_camera(scene, spec)

    pal = spec['palette']
    mats = {
        'floor': organic_material('floor', pal['floor'], pal.get('floor_tip', pal['floor']), rough=0.55, subsurface=0.2, variation=0.20, seed=3.0),
        'road': road_material('road', pal['road'], pal.get('road_glow')),
        'curb': organic_material('curb', pal['curb'], pal.get('curb_tip', pal['curb']), rough=0.24, subsurface=0.5, variation=0.08, seed=5.0),
        'wall': organic_material('wall', pal['wall'], pal.get('wall_tip', pal['curb']), seed=1.0),
        'wall_mid': organic_material('wall_mid', pal.get('wall_mid', pal['wall']), pal.get('wall_tip', pal['curb']), rough=0.34, seed=2.0),
        'wall_far': organic_material('wall_far', pal['wall_far'], pal.get('wall_far_tip', pal['wall']), rough=0.40, subsurface=0.3, seed=4.0),
        'detail': organic_material('detail', pal.get('detail', pal['curb']), pal.get('detail_tip', [1.0, 0.92, 0.82]), rough=0.14, subsurface=0.6, seed=6.0),
        'arch': organic_material('arch', pal.get('arch', [0.62, 0.16, 0.22]), pal.get('arch_tip', [0.95, 0.42, 0.40]), rough=0.22, subsurface=0.55, seed=7.0),
        'droplet': material('droplet', pal.get('droplet', [1.0, 0.86, 0.55]), rough=0.06, emission=pal.get('droplet_glow', [1.0, 0.72, 0.34]), emission_strength=1.4),
        'pool': material('pool', pal.get('pool', [0.30, 0.07, 0.10]), rough=0.05, emission=pal.get('pool_glow', [0.9, 0.35, 0.14]), emission_strength=0.12),
    }

    build_floor(spec, mats)
    build_backdrop(spec, mats)
    build_pools(spec, mats)
    build_lights(spec)
    build_mist(scene, spec)

    all_road_pts = []
    for route in spec['routes']:
        screen_pts = route['points'] if route.get('space', 'screen') == 'screen' else None
        pts = sample_road(world_points(spec, route), 120)
        all_road_pts.append(pts)
        obj = road_curve(route['id'], pts, spec['road']['width'])
        obj.data.materials.append(mats['road'])
        edge = road_curve(route['id'] + '-curb', pts, spec['road']['width'] + spec['road']['curb'], lift=-0.05)
        edge.data.materials.append(mats['curb'])
        screen = road_screen_points(scene, cam, pts)
        build_walls(spec, pts, mats, scene, cam, screen)
        build_detail(spec, pts, mats)
        build_arches(spec, pts, mats, scene, cam)
        build_droplets(spec, pts, mats)

    out_image = os.path.join(ROOT, 'assets', 'maps', f"map_{spec['key']}.jpg")
    scene.render.image_settings.file_format = 'JPEG'
    scene.render.image_settings.quality = 92
    scene.render.filepath = out_image
    bpy.ops.render.render(write_still=True)

    doc = export_routes(scene, cam, spec, all_road_pts[0])
    out_json = os.path.join(os.path.dirname(spec_path), f"{spec['key']}_export.json")
    json.dump(doc, open(out_json, 'w'), indent=1, ensure_ascii=False)
    print('WROTE', out_image)
    print('WROTE', out_json)


main()
