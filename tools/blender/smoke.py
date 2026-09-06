import bpy, sys, json, math
print("BLENDER", bpy.app.version_string)
print("ENGINES", [e.bl_rna.identifier for e in bpy.types.RenderEngine.__subclasses__()][:6])
scene=bpy.context.scene
print("CURRENT ENGINE", scene.render.engine)
try:
    scene.render.engine='BLENDER_EEVEE_NEXT'; print("EEVEE_NEXT ok")
except Exception as e:
    try:
        scene.render.engine='BLENDER_EEVEE'; print("EEVEE ok")
    except Exception as e2: print("engine fail", e, e2)
print("FINAL ENGINE", scene.render.engine)
