module.exports.getModelSchema = function() {
  return {
    fieldName: {
      'type': 'String',
      'label': 'Title',
      'comments': 'The title of the entry',
      'placement': 'Main content',
      'validation': {},
      'required': false,
      'message': '',
      'display': {
        'index': true,
        'edit': true
      }
    }
  }
}

module.exports.getExtendedModelSchema = function() {
  return {
    field1: {
      'type': 'String',
      'label': 'field1',
      'comments': '',
      'validation': {},
      'required': false,
      'message': ''
    },
    field2: {
      'type': 'Number',
      'label': 'field2',
      'comments': '',
      'validation': {},
      'required': false,
      'message': ''
    }
  }
}