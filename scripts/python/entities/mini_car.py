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
def mini_car ():
    entity = Entity("mini_car")

    # Both names point to assets/bbmodels/mini_car.bbmodel and a texture inside it.
    entity.client.description.add_geometry("mini_car")
    entity.client.description.add_texture(
        blockbench="mini_car",
        component=TextureComponents(color="mini_car"),
    )


    rc = entity.client.description.render_controller("default")
    rc.set_geometry("mini_car")
    rc.add_texture("mini_car")

    entity.server.components.add(
        EntityCollisionBox(width=0.9, height=1.5),
        EntityPhysics(has_collision=True, has_gravity=True),
        EntityPushableByEntity(),
        EntityHealth(value=20, max=20),
        EntityTypeFamily(family=["golem", "mob"]),
        EntityMovement(value=0.25),
        EntityMovementBasic(),
        EntityNavigationWalk(),
        EntityJumpStatic(),
        EntityAIRandomStroll(priority=3),
        EntityAILookAtPlayer(priority=4),
    )

    entity.queue("entities")
    return entity


MiniCar = mini_car()