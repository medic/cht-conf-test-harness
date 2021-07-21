const _ = require('underscore');
const $ = require('jquery');

const getRecordForCompletedForm = require('./enketo');
const saveContact = require('./save-contact');

class FormFiller {
  constructor(formName, form, formXml, options) {
    this.form = form;
    this.formName = formName;
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

  async fillAppForm(multiPageAnswer) {
    const { isComplete, errors } = await fillForm(this, multiPageAnswer);
    const resultingDocs = isComplete ? getRecordForCompletedForm(this.form, this.formXml, this.formName, window.now) : [];
    const [report, ...additionalDocs] = resultingDocs;

    return {
      errors,
      section: 'general',
      report,
      additionalDocs,
    };
  }

  async fillContactForm(contactType, multiPageAnswer) {
    const { isComplete, errors } = await fillForm(this, multiPageAnswer);
    const contacts = isComplete ? await saveContact(this.form, contactType, window.now) : [];

    return {
      errors,
      section: 'general',
      contacts
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

    return Promise.all( validations )
      .then(() => {
        const validationErrors = $container
          .find('.invalid-required:not(.disabled), .invalid-constraint:not(.disabled), .invalid-relevant:not(.disabled)')
          .children('span.active:not(.question-label)')
          .filter(function() {
            return $(this).css('display') === 'block';
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
}

const fillForm = async (self, multiPageAnswer) => {
  self.log(`Filling form in ${multiPageAnswer.length} pages.`);
  const results = [];
  for (const pageIndex in multiPageAnswer) {
    const pageAnswer = multiPageAnswer[pageIndex];
    makeNoteFieldsNotRequired();
    const result = await fillPage(self, pageAnswer);
    results.push(result);

    if (result.errors.length > 0) {
      return {
        errors: result.errors,
        section: `page-${pageIndex}`,
        answers: pageAnswer,
      };
    }
  }

  self.form.validateAll();
  const errors = await self.getVisibleValidationErrors();
  const isComplete = self.form.pages.getCurrentIndex() === self.form.pages.$activePages.length - 1;
  const incompleteError = isComplete ? [] : [{ type: 'general', msg: 'Form is incomplete' }];

  return {
    isComplete,
    errors: [...incompleteError, ...errors],
  };
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

  const allPagesSuccessful = hasPages(window.form) ? await window.form.pages.next() : true;
  const validationErrors = await self.getVisibleValidationErrors();
  const advanceFailure = allPagesSuccessful || validationErrors.length ? [] : [{
    type: 'general',
    msg: 'Failed to advance to next page',
  }];

  return {
    errors: [...advanceFailure, ...validationErrors],
  };
};

const fillQuestion = (question, answer) => {
  if(answer === null || answer === undefined) {
    return;
  }

  const $question = $(question);
  const allInputs = $question.find('input:not([type="hidden"]),textarea,button');
  const firstInput = Array.from(allInputs)[0];

  if (!firstInput) {
    throw 'No input field found within question';
  }

  if (firstInput.localName === 'textarea') {
    return allInputs.val(answer).trigger('change');
  }

  switch (firstInput.type) {
  case 'button':
    // select_one appearance:minimal
    if (firstInput.className.includes('dropdown-toggle')) {
      $question.find(`input[value="${answer}"]:not([checked="checked"])`).click();
    }

    // repeate section
    else {

      if (!Number.isInteger(answer)) {
        throw `Failed to answer question which is a "+" for repeat section. This question expects an answer which is an integer - representing how many times to click the +. "${answer}"`;
      }

      for (let i = 0; i < answer; ++i) {
        allInputs.click();
      }
    }
    break;
  case 'radio':
    $question.find(`input[value="${answer}"]`).click();
    break;
  case 'date':
  case 'text':
  case 'tel':
  case 'time':
  case 'number':
    allInputs.val(answer).trigger('change');
    break;
  case 'checkbox': {
    /*
    There are two accepted formats for multi-select checkboxes
    Option 1 - A set of comma-delimited boolean strings representing the state of the boxes. eg. "true,false,true" checks the first and third box
    Option 2 - A set of comma-delimited values to be checked. eg. "heart_condition,none" checks the two boxes with corresponding values
    */
    const answerArray = Array.isArray(answer) ? answer.map(answer => answer.toString()) : answer.split(',');
    const isNonBooleanString = str => !str || !['true', 'false'].includes(str.toLowerCase());
    const answerContainsSpecificValues = answerArray.some(isNonBooleanString);

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
  }
  default:
    throw `Unhandled input type ${firstInput.type}`;
  }
};

const getVisibleQuestions = form => {
  const currentPage = hasPages(form.form) ? form.form.pages.getCurrent() : form.form.pages.form.view.$;

  if (!currentPage) {
    throw Error('Form has no active pages');
  }

  if (currentPage.hasClass('question')) {
    return currentPage;
  }

  const findQuestionsInSection = section => {
    const inquisitiveChildren = Array.from($(section)
      .children(`
        section:not(.disabled,.or-appearance-hidden),
        fieldset:not(.disabled,.note,.or-appearance-hidden,.or-appearance-label,#or-calculated-items),
        label:not(.disabled,.note,.or-appearance-hidden),
        div.or-repeat-info:not(.disabled,.or-appearance-hidden):not([data-repeat-count])
      `));

    const result = [];
    for (const child of inquisitiveChildren) {
      const questions = child.localName === 'section' ? findQuestionsInSection(child) : [child];
      result.push(...questions);
    }

    return result;
  };

  return findQuestionsInSection(currentPage);
};

/*
Not sure why the input element for the 'note' labels is a required field or how this
doesn't trigger warnings in webapp. As a workaround, just update notes so that they are not
required
*/
function makeNoteFieldsNotRequired() {
  window.$$('label.note > input').attr('data-required', '');
}

const hasPages = form => form.pages.getCurrent().length > 0;

module.exports = FormFiller;
