const _ = require('lodash');
// const $ = require('jquery');
// const $ = window.$;

const getForm = () => $('form');
// TODO Prob just change to getVisibleValidationErrors
const hasInvalidField = () => $('.invalid-required, .invalid-constraint').length;
const getPages = () => $('[role="page"]');
const getCurrentPage = () => $('[role="page"].current');


class FormFiller {
  constructor(options) {
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

  async fillForm(multiPageAnswer) {
    const { isComplete, errors } = await fillForm(this, multiPageAnswer);
    return { isComplete, errors };
  }

  // Modified from enketo-core/src/js/Form.js validateContent
  async getVisibleValidationErrors() {
    const self = this;
    const $container = getForm();
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
  }
}

const fillForm = async (self, multiPageAnswer) => {
  self.log(`Filling form in ${multiPageAnswer.length} pages.`);
  const results = [];
  for (const pageIndex in multiPageAnswer) {
    const pageAnswer = multiPageAnswer[pageIndex];
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

  let errors;
  let isComplete;
  let pageHasAdvanced;
  // attempt to submit all the way to the end (replacement for validateAll)
  do {
    pageHasAdvanced = await nextPage();
    errors = await self.getVisibleValidationErrors();

    const pages = getPages();
    isComplete = pages.index(getCurrentPage()) === pages.length - 1;
  } while (pageHasAdvanced && !isComplete && !errors.length);
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
    const $questions = getVisibleQuestions();
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

  const allPagesSuccessful = await nextPage();
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
  const allInputs = $question.find('input:not([type="hidden"]),textarea,button,select');
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
  case 'tel':
  case 'time':
  case 'number':
    allInputs.val(answer).trigger('change');
    break;
  case 'text':
    if (allInputs.parent().hasClass('date')) {
      allInputs.first().datepicker('setDate', answer);
    } if (allInputs.hasClass('timepicker-default')) {
      const [date, time] = answer.split(' ', 2);
      if (!time) {
        throw new Error('Elements of type datetime expect input in format: "2022-12-31 13:21"');
      }

      allInputs.eq(0).datepicker('setDate', date);
      allInputs.eq(1).val(time).trigger('change');
    } else {
      allInputs.val(answer).trigger('change');
    }
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
  case 'select-one':
    allInputs.val(answer).trigger('change');
    break;
  default:
    throw `Unhandled input type ${firstInput.type}`;
  }
};

const getVisibleQuestions = () => {
  const currentPage = getCurrentPage();
  
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
        label:not(.disabled,.readonly,.or-appearance-hidden),
        div.or-repeat-info:not(.disabled,.or-appearance-hidden):not([data-repeat-count]),
        i,
        b
      `));

    const result = [];
    for (const child of inquisitiveChildren) {
      const questions = ['section', 'i', 'b'].includes(child.localName) ? findQuestionsInSection(child) : [child];
      result.push(...questions);
    }

    return result;
  };

  return findQuestionsInSection(currentPage);
};

const nextPage = async () => {
  const currentPageIndex = getPages().index(getCurrentPage());
  const nextButton = $('button.next-page');
  if(nextButton.is(':hidden')) {
    return !hasInvalidField();
  }

  return new Promise(resolve => {
    const observer = new MutationObserver(mutations => {
      if(getPages().index(getCurrentPage()) > currentPageIndex) {
        observer.disconnect();
        return resolve(true);
      }
      if(hasInvalidField()) {
        observer.disconnect();
        return resolve(false);
      }
    });

    observer.observe(getForm().get(0), {
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'display'],
    });
    nextButton.click();
  });
};

module.exports = FormFiller;
