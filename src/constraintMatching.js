/* @flow */

import {
  Box,
  Constraint,
  Layout,
  Property,
  cloneConstraint,
  getPropertyConstraint,
} from './layoutIntent'

import {
  Component,
  ComponentReplacement,
  Patterns,
} from './component'

import _ from 'underscore'

export class IterativeComponentReplacement {
  _layout: Layout;

  constructor(layout: Layout) {
    this._layout = layout;
  }

  run() {
    debugger;
    while (!this._isDone()) {
      // Use preferred patterns first
      for (var i = 0; i < Patterns.allPatterns.length; ++i) {
        var replacementResult: ?ComponentReplacement;
        var pattern = Patterns.allPatterns[i];

        for (var j = 0; j < this._layout.getBoxes().length; ++j) {
          var box = this._layout.getBoxes()[j];
          replacementResult = pattern(box);
          if (replacementResult) {
            break;
          }
        }

        // If we want to replace anything, restart the whole process
        if (replacementResult) {
          this._replace(replacementResult);
          break;
        }
      }
    }
  }

  _isDone() {
    return this._layout.getBoxes().every(box => box instanceof Component);
  }

  _replace(replacement: ComponentReplacement) {
    var allConstraints: Constraint[] = [];
    replacement.boxesToReplace.forEach(box =>  {
      allConstraints.push(...box.getConstraints());
    });

    var affectedProps: Property[] = [];
    allConstraints.forEach(
      constraint => {
        var props =
          this._layout.getPropertiesDirectlyDependentOn(constraint)
            .filter(prop => !_.contains(replacement.boxesToReplace, prop.box));
        affectedProps.push(...props);
      }
    );

    // TODO there's a bug here where the replaced constraint may be a dependent
    // of affectedProps, and we'll have to recalculate.
    affectedProps.forEach(
      prop => {
        var constraint = getPropertyConstraint(prop);
        this._layout.replaceConstraint(
          constraint,
          replacement.component.getReplacementConstraint(constraint)
        );
      }
    );

    replacement.boxesToReplace.forEach(
      box => this._layout.removeBox(box)
    );
    
  }
}
