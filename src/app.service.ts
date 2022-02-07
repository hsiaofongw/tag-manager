import { Injectable } from '@nestjs/common';
import { syntaxAnalysisConfiguration } from './parser/helpers';
import { ToCharacters, ToToken } from './lexer/lexer';
import { createInterface } from 'readline';
import { LL1PredictiveParser, ToTerminalNode } from './parser/parser';
import { stdin, stdout } from 'process';
import { ExpressionTranslate } from './translate/translate';

@Injectable()
export class AppService {
  main(): void {
    const lineStream = createInterface({ input: stdin, output: stdout });

    let lineNumber = 0;
    const asking = () => {
      lineStream.question(`\nIn[${lineNumber}]: `, (expression) => {
        toChars.write(expression);
      });
    };

    asking();

    const toChars = new ToCharacters();
    const toToken = new ToToken();
    const toTerminalNode = new ToTerminalNode(syntaxAnalysisConfiguration);
    const parse = new LL1PredictiveParser(syntaxAnalysisConfiguration);
    const translate = new ExpressionTranslate();

    // const inputString1 = '124 + 456 * ( 3.178 - 4965.0 * .145 ) - 5 / 3 + 2.259';
    // const inputString2 = '4 * (.1 - 1.) + 2';

    toChars.pipe(toToken).pipe(toTerminalNode).pipe(parse).pipe(translate);

    translate.on('data', (datum) => {
      console.log(`\nOut[${lineNumber}]:`);
      lineNumber = lineNumber + 1;

      asking();
    });
  }
}
