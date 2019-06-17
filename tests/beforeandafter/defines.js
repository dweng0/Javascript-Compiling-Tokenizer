define(['core/helpers/formatters/booleans',
        'core/helpers/formatters/datasize',
        'core/helpers/formatters/date',
        'core/helpers/formatters/nodes',
        'core/helpers/formatters/operatingsystem',
        'core/helpers/formatters/policies',
        'core/helpers/formatters/strings',
        'core/helpers/formatters/username'],
 function(/* args** */) {
'use strict';

	var args = _.toArray(arguments);
	args.unshift({});

	return _.extend.apply(_, args);
});
