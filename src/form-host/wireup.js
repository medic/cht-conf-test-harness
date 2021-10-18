const $ = require('jquery');
const EnketoForm = require('enketo-core/src/js/Form');

const xmlSerializer = new window.XMLSerializer();
class FormWireup {
  constructor(openrosa2html5form, openrosa2xmlmodel) {
    this.htmlTransformer = initTransformer(openrosa2html5form);
    this.modelTransformer = initTransformer(openrosa2xmlmodel);
  }

  render(formXml, content, user, contactSummary) {
    if (!formXml || typeof formXml !== 'string') {
      throw new Error('Invalid argument: xformData');
    }

    if (!content || typeof content !== 'object') {
      throw new Error('Invalid argument: content');
    }

    const xform = $.parseXML(formXml);

    setLanguageOnForm(xform, 'en');

    const html = this.htmlTransformer(xform);
    const model = this.modelTransformer(xform);

    const $html = $(html);
    const enketoOptions = {
      modelStr: model,
      instanceStr: bindDataToModel(model, content, user),
      external: contactSummary ? [ contactSummary ] : undefined,
    };

    $('.container').first().html($html);

    const element = $('#task-report').find('form').first();
    const form = new EnketoForm(element, enketoOptions);
    const loadErrors = form.init();
    if (loadErrors && loadErrors.length) {
      throw new Error(`Load Errors: ${JSON.stringify(loadErrors)}`);
    }

    return form;
  }
}

const initTransformer = transform => {
  if (!transform) {
    throw new Error('Invalid argument: value');
  }

  const xlt = $.parseXML(transform);
  const processor = new window.XSLTProcessor();
  processor.importStylesheet(xlt);

  return xform => {
    const transformedDoc = processor.transformToDocument(xform);
    const rootElement = transformedDoc.documentElement.firstElementChild;
    return xmlSerializer.serializeToString(rootElement);
  };
};

// set the user's language as default so it'll be used for itext translations
const setLanguageOnForm = function(xform, language) {
  const $xform = $(xform);
  $xform.find('model itext translation[lang="' + language + '"]').attr('default', '');
  return xform;
};

/* Enketo Prepopulation Data */
const bindDataToModel = (model, data, user) => {
  const xmlModel = $($.parseXML(model));
  const bindRoot = xmlModel.find('model instance').children().first();

  const userRoot = bindRoot.find('>inputs>user');
  if (data) {
    bindJsonToXml(bindRoot, data, function(name) {
      // Either a direct child or a direct child of inputs
      return '>%, >inputs>%'.replace(/%/g, name);
    });
  }

  if (userRoot.length) {
    bindJsonToXml(userRoot, user);
  }

  return new window.XMLSerializer().serializeToString(bindRoot[0]);
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
