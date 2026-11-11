from anvil.api.actors.components import (
    EntityAILookAtPlayer,
    EntityAIRandomStroll,
    EntityCollisionBox,
    EntityHealth,
    EntityJumpStatic,
    EntityMovement,
    EntityMovementBasic,
    EntityNavigationWalk,
    EntityPhysics,
    EntityPushableByEntity,
    EntityTypeFamily,
)
from anvil.api.actors.entity import Entity
from anvil.api.pbr.texture_set import TextureComponents

# Namespace is inferred from anvilconfig; only provide the short name here.
def mini_car_black ():
    entity = Entity("mini_car_black")

    # Both names point to assets/bbmodels/mini_car.bbmodel and a texture inside it.
    entity.client.description.add_geometry("mini_car_black")
    entity.client.description.add_texture(
        blockbench="mini_car_black",
        component=TextureComponents(color="mini_car_black"),
    )


    rc = entity.client.description.render_controller("default")
    rc.set_geometry("mini_car_black")
    rc.add_texture("mini_car_black")

    entity.server.components.add(
        EntityCollisionBox(width=0.9, height=1.5),
        EntityPhysics(has_collision=True, has_gravity=True),
        EntityPushableByEntity(),
        EntityHealth(value=20, max=20),
        EntityTypeFamily(family=["golem", "mob"]),
        EntityMovement(value=0.25),
    )

    entity.queue("entities")
    return entity


MiniCarBlack = mini_car_black()