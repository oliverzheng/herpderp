/* @flow */

import {
  Box,
  Constraint,
  Layout,
  Length,
} from './layoutIntent'
import {IterativeComponentReplacement} from './constraintMatching'

var layout = new Layout();
var box = new Box();
layout.addBox(box);

box.setX(Length.px(0));
box.setY(Length.px(0));
box.setW(Length.px(200));
box.setH(Length.px(200));
box.style.background = 'cyan';

var replacement = new IterativeComponentReplacement(layout);

console.log('layout before:');
console.log(layout.toString());

console.log('');
console.log('replacing start');
replacement.run();
console.log('replacing end');
console.log('');

console.log('layout after:');
console.log(layout.toString());
