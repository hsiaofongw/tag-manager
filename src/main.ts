/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { LL1PredictiveParser } from './parser/parser';
import { stdin, stdout } from 'process';
import { ExpressionTranslate } from './translate/translate';
import { ExpressionNodeSerialize } from './translate/serialize';
import { Evaluator, PreEvaluator } from './translate/evaluate';
import { EvaluateResultObject } from './translate/interfaces';
import { ConfigService } from '@nestjs/config';
import { INestApplication, Logger } from '@nestjs/common';
import { NewLexerFactoryService } from './new-lexer/services/new-lexer-factory/new-lexer-factory.service';
import { MatchResult } from './new-lexer/interfaces';
import { StringHelper } from './helpers/string-helper';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = app.get(ConfigService);
  const inDebug = config.get('NODE_ENV') === 'debug';
  const logger = new Logger(bootstrap.name);
  logger.log(`In Debug Mode: ${inDebug}`);
  await app.listen(3000);

  if (inDebug) {
    console.clear();
    startTestREPL(app);
  }
}
bootstrap();

async function startTestREPL(app: INestApplication) {
  const lexerFactory = app.get(NewLexerFactoryService);
  const toToken = lexerFactory.makeLexer();
  const stringEscapeTransform = StringHelper.makeStringEscapeTransform();
  toToken.pipe(stringEscapeTransform);

  // 开始 REPL
  stringEscapeTransform.on('data', (resultString: MatchResult) => {
    console.log(resultString);
  });
  stdin.on('data', (d) => {
    const inputContent = d.toString('utf-8').replace(/\s/g, ' ');
    for (const char of inputContent) {
      toToken.write(char);
    }
  });
}

async function startCommandLineREPL(app: INestApplication) {
  // 初始化
  const initialSeqNum = 0;
  let currentSeqNum = initialSeqNum;
  const resultObjsBuffer: EvaluateResultObject[] = [];
  const promptContentFn = (seqNum: number) => `In[${seqNum}]:= `;
  const outputPrefixFn = (seqNum: number) => `\nOut[${seqNum}]= `;
  const outputPostfix = '\n\n';

  const lexerFactory = app.get(NewLexerFactoryService);

  const toToken     = lexerFactory.makeLexer();          // Tokenizing
  const parse       = new LL1PredictiveParser();         // Parsing, i.e. build tree
  const translate   = new ExpressionTranslate();         // Tree to Expr transformation
  const preEvaluate = new PreEvaluator();                // Pre-Evaluate
  const evaluate    = new Evaluator(currentSeqNum);      // Evaluate Expr
  const serialize   = new ExpressionNodeSerialize();     // Expr to string transformation

  let inputBuffer  = '';

  /** 组建解释器 */
    toToken
    .pipe(parse)
    .pipe(translate)
    .pipe(preEvaluate)
    .pipe(evaluate);

  // 连接到 AssembledEvaluator, 并将 AssembledEvaluator 连接到 Serializer
  evaluate.on('data', (evaluateResultObject: EvaluateResultObject) => {
    const receivedSeqNum = evaluateResultObject.seqNum;
    const expectingSeqNum = currentSeqNum;
    resultObjsBuffer.push(evaluateResultObject);
    if (receivedSeqNum === expectingSeqNum) {
      resultObjsBuffer.sort((a, b) => a.seqNum - b.seqNum);
      const maxReceivedSeqNum =
        resultObjsBuffer[resultObjsBuffer.length - 1].seqNum;
      while (resultObjsBuffer.length) {
        serialize.write(resultObjsBuffer.shift().result);
      }
      currentSeqNum = maxReceivedSeqNum + 1;
      stdout.write(promptContentFn(currentSeqNum));
    }
  });

  // 开始 REPL
  stdout.write(promptContentFn(currentSeqNum));
  serialize.on('data', (resultString: string) => {
    stdout.write(outputPrefixFn(currentSeqNum));
    stdout.write(resultString);
    stdout.write(outputPostfix);
  });
  stdin.on('data', (d) => {
    const inputContent = d.toString('utf-8').replace(/\s/g, ' ');
    const semiColumnIndex = inputContent.indexOf(';');
    if (semiColumnIndex === -1) {
      inputBuffer = inputBuffer + inputContent;
    } else {
      for (let i = 0; i < inputContent.length; i++) {
        if (inputContent[i] === ';') {
          if (inputBuffer.trim().length) {
            toToken.write(inputBuffer.trim());
            inputBuffer = '';
          }
          continue;
        }
        inputBuffer = inputBuffer + inputContent[i];
      }
    }
  });
}
