import { App } from 'vue';
import Button from './button';
import ButtonGroup from './button-group';

Button.Group = ButtonGroup;

/* istanbul ignore next */
Button.install = function(app: App) {
  app.component(Button.name, Button);
  app.component(ButtonGroup.name, ButtonGroup);
};

export default Button;