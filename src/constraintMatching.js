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

  run(): bool {
    while (!this._isDone()) {
      var replacementResult: ?ComponentReplacement;

      // Use preferred patterns first
      patterns:
      for (var i = 0; i < Patterns.allPatterns.length; ++i) {
        var pattern = Patterns.allPatterns[i];

        for (var j = 0; j < this._layout.getBoxes().length; ++j) {
          var box = this._layout.getBoxes()[j];
          replacementResult = pattern(box);
          if (replacementResult) {
            // If we want to replace anything, restart the whole process
            break patterns;
          }
        }
      }

      if (replacementResult) {
        this._replace(replacementResult);
      } else if (!this._isDone()) {
        // We don't have any patterns to update any boxes, and yet we aren't
        // finished.
        return false;
      }
    }
    return true;
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
