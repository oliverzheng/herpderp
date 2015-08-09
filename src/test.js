/* @flow */

import {
  Box,
  DependentOperand,
  Layout,
  Length,
  Operation,
} from './layoutIntent';
import {IterativeComponentReplacement} from './constraintMatching';
import nullthrows from './nullthrows';
import {reprToString} from './repr';

var layout = new Layout();

// Basic box
var box1 = new Box();
layout.addBox(box1);
box1.setX(Length.px(0));
box1.setY(Length.px(0));
box1.setW(Length.px(200));
box1.setH(Length.px(200));
box1.style.background = 'cyan';

// Useless box that no one references
var box2 = new Box();
layout.addBox(box2);
box2.setX(Length.px(50));
box2.setY(Length.px(50));
box2.setW(Length.px(100));
box2.setH(Length.px(100));

// Box with dependent constraints
var box3 = new Box();
layout.addBox(box3);
box3.setX(
  new DependentOperand(
    Operation.EQUALS,
    [nullthrows(box1.getX())]
  )
);
box3.setY(
  new DependentOperand(
    Operation.ADD,
    [
      nullthrows(box1.getY()),
      nullthrows(box1.getH()),
      Length.px(50),
    ]
  )
);
box3.setW(Length.px(200));
box3.setH(Length.px(200));
box3.style.background = 'green';

var replacement = new IterativeComponentReplacement(layout);

console.log('# Replacing start');
var step = 0;
replacement.setStepCallback(
  () => {
    console.log('# Step', step++);
    console.log(reprToString(layout.toRepr()));
  }
);
var result = replacement.run();
console.log('# Replacing end result =', result);
