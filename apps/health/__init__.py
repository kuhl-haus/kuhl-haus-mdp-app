from py4web import action


@action('index')
def page():
    return "OK"
