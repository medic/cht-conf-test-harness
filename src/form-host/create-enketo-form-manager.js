// const {
//   ContactServices,
//   FileServices,
//   FormDataServices,
//   TranslationServices,
//   XmlServices,
//   EnketoFormManager
// } = require('@cht-core/webapp/src/js/enketo/enketo-form-manager');

const HARDCODED_TYPES = [
  'district_hospital',
  'health_center',
  'clinic',
  'person'
];

const createEnketoFormManager = (formHtml, formModel, formXml, userSettingsDoc, contactSummary) => {
  const dbService = {
    get: () => ({
      // for sibling doc scenario with contact forms?
      get: () => Promise.resolve({}), 
      getAttachment: (formId, attachment) => {
        if (attachment === 'form.html') {
          return Promise.resolve(formHtml);
        }
        if (attachment === 'model.xml') {
          return Promise.resolve(formModel);
        }
        if (attachment === 'form.xml') {
          return Promise.resolve(formXml);
        }

        // assume media attachment
        return Promise.resolve(new Blob());
      },
      bulkDocs: () => Promise.resolve([]),

      // used by phone-widget to now allow multiple contacts with the same phone
      query: () => ({
        rows: [],
      }),
    }),
  };
  // window.CHTCore.DB = dbService;

  const extractLineageService = {
    extract: contact => contact,
  };
  const userContactService = {
    get: () => Promise.resolve({
      _id: 'user_contact_service',
    }),
  };
  const userSettingsService = {
    get: () => Promise.resolve(userSettingsDoc),
  };

  const fileReaderService = {
    utf8: x => x,
  };
  const contactSummaryService = {
    get: () => contactSummary,
  };
  const languageService = {
    get: () => Promise.resolve('en'),
  };
  // window.CHTCore.Language = languageService;

  const lineageModelGeneratorService = {
    contact: () => Promise.resolve({
      lineage: ['lineage_parent_1', 'lineage_parent_2'],
    }),
  };
  const searchService = {
    search: () => [],
  };
  const translateService = {
    get: x => Promise.resolve(x),
    instant: x => x,
  };
  // window.CHTCore.Translate = translateService;

  const translateFromService = {
    get: x => x,
  };
  const addAttachmentService = {
    remove: () => {},
  };
  const getReportContentService = {};
  const xmlFormsService = {
    get: () => Promise.resolve({}),
    getDocAndFormAttachment: () => Promise.resolve({ xml: formXml, doc: {} }),
  };
  const transitionsService = {
    // this is some muting business
    applyTransitions: x => Promise.resolve(x),
  };
  const contactTypesService = {
    isHardcodedType: type => HARDCODED_TYPES.includes(type),
  };
  const GlobalActions = { setSnackbarContent : () => {} };

  // window.CHTCore.AndroidAppLauncher = { isEnabled: () => false };
  // window.CHTCore.MRDT = { enabled: () => false };
  // window.CHTCore.Select2Search = { init: () => Promise.resolve() };
  // window.CHTCore.Settings = {
  //   get: () => Promise.resolve({
  //     default_country_code: '1'
  //   })
  // };

  return {};
  // return new EnketoFormManager(
  //   new ContactServices(
  //     extractLineageService,
  //     userContactService,
  //     contactTypesService,
  //   ),
  //   new FileServices(dbService, fileReaderService),
  //   new FormDataServices(
  //     contactSummaryService,
  //     userSettingsService,
  //     languageService,
  //     lineageModelGeneratorService,
  //     searchService
  //   ),
  //   new TranslationServices(translateService, translateFromService),
  //   new XmlServices(
  //     addAttachmentService,
  //     getReportContentService,
  //     xmlFormsService
  //   ),
  //   transitionsService,
  //   GlobalActions
  // );
};

module.exports = createEnketoFormManager;
