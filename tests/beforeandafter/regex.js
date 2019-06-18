import * as _ from 'underscore';
import * as colors from 'colors';

const CARRIAGE_RETURN = /\n/;
const EOL = /\r/;
const WHITESPACE = /\s/;
const NUMBERS = /[0-9]/;
const DECLARABLE_CHARACTERS = /[A-Za-z_.$]/i;