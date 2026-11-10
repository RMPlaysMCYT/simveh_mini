#Filename: main.py
#Generated with StarkTMA/Anvil 1.0.1
#Time: 10-11-2026 04:32:57 +0800
#Property of Sivemini

from entities.mini_car import mini_car
from entities.mini_car_black import mini_car_black

from anvil import *

if __name__ == "__main__":
    ANVIL.compile(extract_world=None)
    # ANVIL.package()
    mini_car()
    mini_car_black()