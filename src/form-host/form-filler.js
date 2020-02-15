const _ = require('underscore');
const $ = require('jquery');

const getRecordForCompletedForm = require('./get-record-from-form');

class FormFiller {
  constructor(formName, form, formXml, options) {
    this.form = form;
    this.formName = formName,
    this.formXml = formXml;
    this.options = _.defaults(options, {
      verbose: true,
    });
    this.log = (...args) => this.options.verbose && console.log('FormFiller', ...args);
  }

  /**
   * An object describing the result of filling a form.
   * @typedef {Object} FillResult
   * @property {FillError[]} errors A list of errors 
   * @property {string} section The page number on which the errors occurred
   * @property {Object} report The report object which resulted from submitting the filled report. Undefined if an error blocks form submission.
   * @property {Object[]} additionalDocs An array of database documents which are created in addition to the report.
   */

  /**
   * An object describing an error which has occurred while filling a form.
   * @typedef {Object} FillError 
   * @property {string} type A classification of the error [ 'validation', 'general', 'page' ]
   * @property {string} msg Description of the error 
   */
  async fill(multiPageAnswer) {
    this.log(`Filling in ${multiPageAnswer.length} pages.`);
    const results = [];
    for (let pageIndex in multiPageAnswer) {
      const pageAnswer = multiPageAnswer[pageIndex];
      makeNoteFieldsNotRequired();
      const result = await fillPage(this, pageAnswer);
      results.push(result);

      if (result.errors.length > 0) {
        return {
          errors: result.errors,
          section: `page-${pageIndex}`,
          answers: pageAnswer,
        };
      }
    }

    this.form.validateAll();
    const errors = await this.getVisibleValidationErrors();
    const isComplete = this.form.pages.getCurrentIndex() === this.form.pages.$activePages.length - 1;
    const incompleteError = isComplete ? [] : [{ type: 'general', msg: 'Form is incomplete' }];

    const resultingDocs = isComplete ? getRecordForCompletedForm(this.form, this.formXml, this.formName, window.now) : [];
    const [report, ...additionalDocs] = resultingDocs;
    return {
      errors: [...incompleteError, ...errors],
      section: 'general',
      report,
      additionalDocs,
    };
  }

  // Modified from enketo-core/src/js/Form.js validateContent
  getVisibleValidationErrors() {
    const self = this;
    const $container = self.form.view.$;
    const validations = $container.find('.question').addBack('.question').map(() => {
      const $elem = $(this).find('input:not(.ignore):not(:disabled), select:not(.ignore):not(:disabled), textarea:not(.ignore):not(:disabled)');
      if ($elem.length === 0) {
        return Promise.resolve();
      }
      return self.form.validateInput( $elem.eq( 0 ) );
    }).toArray();

    return Promise.all( validations ).then(() => {
        const validationErrors = $container
          .find('.invalid-required:not(.disabled), .invalid-constraint:not(.disabled), .invalid-relevant:not(.disabled)')
          .children('span.active:not(.question-label)')
          .filter(function() {
            return $(this).css('display') == 'block';
          });

        return Array.from(validationErrors)
          .map(span => ({
            type: 'validation',
            question: span.parentElement.innerText,
            msg: span.innerText,
          }));
      })
      .catch(err => [{
        type: 'failure to validate',
        msg: err,
      }]);
  }
};

const fillPage = async (self, pageAnswer) => {
  self.log(`Answering ${pageAnswer.length} questions.`);

  const answeredQuestions = new Set();
  for (let i = 0; i < pageAnswer.length; i++) {
    const answer = pageAnswer[i];
    const $questions = getVisibleQuestions(self);
    if ($questions.length <= i) {
      return {
        errors: [{
          type: 'page',
          answers: pageAnswer,
          section: `answer-${i}`,
          msg: `Attempted to fill ${pageAnswer.length} questions, but only ${$questions.length} are visible.`,
        }],
      };
    }

    const nextUnansweredQuestion = Array.from($questions).find(question => !answeredQuestions.has(question));
    answeredQuestions.add(nextUnansweredQuestion);
    fillQuestion(nextUnansweredQuestion, answer);
  }
  
  const success = await form.pages.next();
  const validationErrors = await self.getVisibleValidationErrors();
  const advanceFailure = success || validationErrors.length ? [] : [{
    type: 'general',
    msg: 'Failed to advance to next page',
  }];
  
  return {
    errors: [...advanceFailure, ...validationErrors],
  };
}

const fillQuestion = (question, answer) => {
  if (!answer) return;
  
  const $question = $(question);
  const allInputs = $question.find('input,textarea');
  const firstInput = Array.from(allInputs)[0];
  
  if (!firstInput) {
    throw 'No input field found within question';
  }

  if (firstInput.localName === 'textarea') {
    return allInputs.val(answer).trigger('change');
  }

  switch (firstInput.type) {
    case 'radio':
      $question.find(`input[value="${answer}"]`).click();
      break;
    case 'date':
    case 'text':
    case 'number':
        allInputs.val(answer).trigger('change');
      break;
    case 'checkbox':
      /*
      There are two accepted formats for multi-select checkboxes
      Option 1 - A set of comma-delimited boolean strings representing the state of the boxes. eg. "true,false,true" checks the first and third box
      Option 2 - A set of comma-delimited values to be checked. eg. "heart_condition,none" checks the two boxes with corresponding values
      */
      const answerArray = Array.isArray(answer) ? answer.map(answer => answer.toString()) : answer.split(',');
      const isNonBooleanString = str => !str || !['true', 'false'].includes(str.toLowerCase());
      const answerContainsSpecificValues = answerArray.some(isNonBooleanString)
      
      // [value != ""] is necessary because blank lines in `choices` table of xlsx can cause empty unrendered input
      const options = $question.find('input[value!=""]');

      if (!answerContainsSpecificValues) {
        answerArray.forEach((val, index) => {
          const propValue = val === true || val.toLowerCase() === 'true' ? 'checked' : '';
          $(options[index]).prop('checked', propValue).trigger('change');
        });
      } else {
        options.prop('checked', '');
        answerArray.forEach(val => $question.find(`input[value="${val}"]`).prop('checked', 'checked').trigger('change'));
      }
      break;
    default:
      throw `Unhandled input type ${firstInput.type}`;
  }
};

const getVisibleQuestions = form => {
  const currentPage = form.form.pages.getCurrent();
  if (currentPage.hasClass('question')) {
    return currentPage;
  }

  return currentPage.add(currentPage.find('section:not(.disabled)')).children('fieldset:not(.disabled,.note,.or-appearance-hidden,.or-appearance-label), label:not(.disabled,.note,.or-appearance-hidden)');
};

/*
Not sure why the input element for the 'note' labels is a required field or how this
doesn't trigger warnings in webapp. As a workaround, just update notes so that they are not
required
*/
function makeNoteFieldsNotRequired() {
  $$('label.note > input').attr('data-required', '');
}

module.exports = FormFiller;
