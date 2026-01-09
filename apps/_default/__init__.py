# check compatibility
import py4web

assert py4web.check_compatible("1.20190709.1")

# by importing controllers you expose the actions defined in it
from . import controllers
