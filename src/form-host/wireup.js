const $ = require('jquery');
const { toBik_text } = require('bikram-sambat');
const moment = require('moment');

// /home/kenn/webapp/webapp/src/ts/providers/xpath-element-path.provider.ts
const { Xpath } = require('@mm-providers/xpath-element-path.provider');

const medicXpathExtensions = require('@medic-xpath-extensions');
const {
  ContactServices,
  FileServices,
  FormDataServices,
  TranslationServices,
  XmlServices,
  EnketoFormManager
} = require('@medic/enketo-form-manager');

class FormWireup {
  constructor() {
  }

  async render(formHtml, formModel, instanceData) {
    const userContact = { _id: 'user1' };

    // BREAK
    const dbService = {
      get: () => ({
        getAttachment: (formId, attachment) => {
          if (attachment === 'form.html') {
            return Promise.resolve(formHtml);
          }
          if (attachment === 'model.xml') {
            return Promise.resolve(formModel);
          }

          throw new Error(`dbService.get().getAttachment(): Unrecognized attachment requested ${attachment}`);
        },
      }),
    };
    const extractLineageService = {};
    const userContactService = {
      get: () => Promise.resolve(userContact),
    };
    const fileReaderService = {
      utf8: x => x,
    };
    const contactSummaryService = {
      get: (contact, reports, lineage) => {
        // recycle reduce reuse
        return {
          fields: [],
          cards: [],
          context: { foo: 'bar' },
        };
      },
    };
    const enketoPrepopulationDataService = {
      get: (model, data) => {
        if (data && typeof data === 'string') {
          return Promise.resolve(data);
        }
        
        const xml = $($.parseXML(model));
        const bindRoot = xml.find('model instance').children().first();

        const userRoot = bindRoot.find('>inputs>user');

        if (data) {
          bindJsonToXml(bindRoot, data, (name) => {
            // Either a direct child or a direct child of inputs
            return '>%, >inputs>%'.replace(/%/g, name);
          });
        }

        if (userRoot.length) {
          bindJsonToXml(userRoot, userContact);
        }

        return new window.XMLSerializer().serializeToString(bindRoot[0]);
      }
    };
    const languageService = {
      get: () => 'en',
    };
    const lineageModelGeneratorService = {
      contact: () => Promise.resolve({
        lineage: ['lineage_parent_1', 'lineage_parent_2'],
      }),
    };
    const searchService = {
      search: (type, filters, options, extensions, docIds) => {
        // TODO
        return [];
      },
    };
    const translateService = {
      instant: x => x,
    };
    const translateFromService = {
      get: x => x,
    };
    const addAttachmentService = {};
    const enketoTranslationService = {};
    const getReportContentService = {};
    const xmlFormsService = {};
    const transitionsService = {};
    const GlobalActions = {};

    this.enketoFormMgr = new EnketoFormManager(
      new ContactServices(extractLineageService, userContactService),
      new FileServices(dbService, fileReaderService),
      new FormDataServices(
        contactSummaryService,
        enketoPrepopulationDataService,
        languageService,
        lineageModelGeneratorService,
        searchService
      ),
      new TranslationServices(translateService, translateFromService),
      new XmlServices(
        addAttachmentService,
        enketoTranslationService,
        getReportContentService,
        xmlFormsService
      ),
      transitionsService,
      GlobalActions,
      Xpath
    );

    const zscoreUtil = {};
    medicXpathExtensions.init(zscoreUtil, toBik_text, moment);

    // BREAK
    const selector = '#enketo-wrapper';
    const formDoc = { _id: 'whatever', title: 'form name ABC 987' };
    const renderedForm = await this.enketoFormMgr.render(selector, formDoc, instanceData);
    return renderedForm;
  }

  renderContactForm(formContext) {
    return this.enketoFormMgr.renderForm(formContext)
      .then(form => registerListeners(
        formContext.selector,
        form,
        formContext.editedListener,
        formContext.valuechangeListener
      ));
  }

  save(formInternalId, form, geoHandle, docId) {
    // /inputs is ALWAYS relevant #4875
    $('section[name$="/inputs"]').each((idx, element) => {
      if(element.dataset) {
        element.dataset.relevant = 'true()';
      }
    });

    return Promise
      .resolve(form.validate())
      .then((valid) => {
        if (!valid) {
          throw new Error('Form is invalid');
        }

        $('form.or').trigger('beforesave');

        return this.enketoFormMgr.save(formInternalId, form, geoHandle, docId);
      });
  }

  unload(form) {
    this.enketoFormMgr.unload(form);
  }
}

const registerListeners = (selector, form, editedListener, valueChangeListener) => {
  // const $selector = $(selector);
  // if(editedListener) {
  //   $selector.on('edited', () => this.ngZone.run(() => editedListener()));
  // }
  
  // [
  //   valueChangeListener,
  //   () => this.enketoFormMgr.setupNavButtons(form, $selector, form.pages._getCurrentIndex())
  // ].forEach(listener => {
  //   if(listener) {
  //     $selector.on('xforms-value-changed', () => this.ngZone.run(() => listener()));
  //   }
  // });

  return form;
};

/* Enketo Translation Service */
const bindJsonToXml = function(elem, data={}, childMatcher) {
  Object.keys(data).map(key => [key, data[key]])
    .forEach(function(pair) {
      const current = findCurrentElement(elem, pair[0], childMatcher);
      const value = pair[1];

      if (value !== null && typeof value === 'object') {
        if(current.children().length) {
          bindJsonToXml(current, value);
        } else {
          current.text(value._id);
        }
      } else {
        current.text(value);
      }
    });
};

const findCurrentElement = function(elem, name, childMatcher) {
  if (childMatcher) {
    return elem.find(childMatcher(name));
  } 
  
  return elem.children(name);
};

module.exports = FormWireup;
