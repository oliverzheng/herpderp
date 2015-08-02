/* @flow */

import {
  Box,
  Constraint,
  Layout,
  Length,
} from './layoutIntent'
import {IterativeComponentReplacement} from './constraintMatching'

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

var replacement = new IterativeComponentReplacement(layout);

console.log('layout before:');
console.log(layout.toString());

console.log('');
console.log('replacing start');
var result = replacement.run();
console.log('replacing end:', result);
console.log('');

console.log('layout after:');
console.log(layout.toString());
