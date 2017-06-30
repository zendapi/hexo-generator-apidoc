'use strict';

function to_markdown(element, context) {
   let s = '';
   context = context || [];
   switch (typeof element) {
      case 'string':
         s = element;
         break;

      case 'object':
         if (Array.isArray(element)) {
            element.forEach(function (value, key) {
               s += to_markdown(value, context);
            });
         }
         else {

            // opening the element
            switch (element['#name']) {
               case 'ref': return s + markdown.link(to_markdown(element.$$), '#' + element.$.refid, true);
               case '__text__': s = element._; break;
               case 'emphasis': s = '*'; break;
               case 'bold': s = '**'; break;
               case 'parametername':
               case 'computeroutput': s = '`'; break;
               case 'parameterlist': s = '\n#### Parameters\n'; break;
               case 'parameteritem': s = '* '; break;
               case 'programlisting': s = '\n```cpp\n'; break;
               case 'itemizedlist': s = '\n\n'; break;
               case 'listitem': s = '* '; break;
               case 'sp': s = ' '; break;
               case 'heading': s = '## '; break;
               case 'xrefsect': s += '\n> '; break;
               case 'simplesect':
                  if (element.$.kind == 'attention') {
                     s = '> ';
                  }
                  else if (element.$.kind == 'return') {
                     s = '\n#### Returns\n'
                  }
                  else if (element.$.kind == 'see') {
                     s = '\n**See also**: '
                  }
                  else {
                     console.assert(element.$.kind + ' not supported.');
                  }
                  break;

               case 'xreftitle':
               case 'entry':
               case 'row':
               case 'ulink':
               case 'codeline':
               case 'highlight':
               case 'table':
               case 'para':
               case 'parameterdescription':
               case 'parameternamelist':
               case 'xrefdescription':
               case 'verbatim':
               case 'hruler':
               case undefined:
                  break;

               default:
                  console.error(false, element['#name'] + ': not yet supported.');
            }

            // recurse on children elements
            if (element.$$) {
               s += to_markdown(element.$$, context);
            }

            // closing the element
            switch (element['#name']) {
               case 'parameterlist':
               case 'para': s += '\n\n'; break;
               case 'emphasis': s += '*'; break;
               case 'bold': s += '**'; break;
               case 'parameteritem': s += '\n'; break;
               case "computeroutput": s += '`'; break;
               case 'parametername': s += '` '; break;
               case 'entry': s = markdown.escape.cell(s) + '|'; break;
               case 'programlisting': s += '```\n'; break;
               case 'codeline': s += '\n'; break;
               case 'ulink': s = markdown.link(s, element.$.url); break;
               case 'itemizedlist': s += '\n'; break;
               case 'listitem': s += '\n'; break;
               case 'entry': s = ' | '; break;
               case 'xreftitle': s += ': '; break;
               case 'row':
                  s = '\n' + markdown.escape.row(s);
                  if (element.$$ && element.$$[0].$.thead == "yes") {
                     element.$$.forEach(function (th, i) {
                        s += (i ? ' | ' : '\n') + '---------';
                     });
                  }
                  break;
            }

         }
         break;

      default:
         console.assert(false);
   }

   return s;
}

module.exports = {
   to_markdown: to_markdown
};