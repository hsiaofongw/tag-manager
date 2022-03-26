import { SetHelper } from 'src/helpers/set-helper';
import { sbl } from './config';
import { ProductionRule, SymbolType, SyntaxSymbol } from './interfaces';

/** 提供计算 FIRST, EPS, FOLLOW 和 PREDICT 的方法 */
export class PredictHelper {
  /**
   * 此函数用于判断一个符号串 alpha 能否经过 0 步或更多步推导为空串
   *
   * @param alpha 符号串
   * @param rules 语法规则集
   * @returns 如果 alpha *=> epsilon, 返回 true, 否则返回 false
   */
  public static epsilon(
    alpha: SyntaxSymbol[],
    allRules: ProductionRule[],
  ): boolean {
    if (alpha.length === 0) {
      return true;
    }

    const head = alpha[0];
    if (head.type === 'terminal') {
      return false;
    }

    const rules = allRules.filter((rule) => rule.lhs.id === head.id);
    for (const rule of rules) {
      if (PredictHelper.epsilon(rule.rhs, allRules)) {
        return PredictHelper.epsilon(alpha.slice(1, alpha.length), allRules);
      }
    }

    return false;
  }

  public static first(
    sbls: SyntaxSymbol[],
    productionRules: ProductionRule[],
  ): {
    symbolIdSet: Set<SyntaxSymbol['id']>;
  } {
    if (sbls.length === 0) {
      return { symbolIdSet: new Set<SyntaxSymbol['id']>([]) };
    }

    const head = sbls[0];
    if (head.type === 'terminal') {
      return { symbolIdSet: new Set<SyntaxSymbol['id']>([head.id]) };
    }

    // 当前 sbls 中的第一个是一个 nonTerminal
    // 记它为 A, 我们要找的所有 A -> x 这样的产生式（x 可以是 epsilon）
    // 检查每一个这样的 x 的 First 集，如果有空的（也就是说 A *=> eps），那么，我们还要再计算 sbls[1..] 的 First

    const rules = productionRules.filter((rule) => rule.lhs.id === head.id);
    const firstResults = rules.map((rule) =>
      PredictHelper.first(rule.rhs, productionRules),
    );

    const firstUnion: Set<SymbolType> = firstResults
      .map((x) => x.symbolIdSet)
      .reduce((a, b) => SetHelper.union(a, b), new Set<SymbolType>([]));

    for (const res of firstResults) {
      if (res.symbolIdSet.size === 0) {
        // rules 中存在 A -> eps 这样的

        const rest = PredictHelper.first(
          sbls.slice(1, sbls.length),
          productionRules,
        );

        return { symbolIdSet: SetHelper.union(firstUnion, rest.symbolIdSet) };
      }
    }

    // 到了这，说明 A 推不出 eps

    return { symbolIdSet: firstUnion };
  }

  public static calculateFollowSet(
    productionRules: ProductionRule[],
  ): Record<SyntaxSymbol['id'], Set<SyntaxSymbol['id']>> {
    const makeEmptySet: () => Set<SyntaxSymbol['id']> = () =>
      new Set<SyntaxSymbol['id']>();
    const result: Record<
      SyntaxSymbol['id'],
      Set<SyntaxSymbol['id']>
    > = {} as any;
    result[sbl.s.id] = new Set<SyntaxSymbol['id']>([sbl.eof.id]); // Follow(S) = { $$ };

    const getTotalCount: () => number = () => {
      let totalCount = 0;
      for (const key in result) {
        totalCount = totalCount + (result[key] as Set<unknown>).size;
      }
      return totalCount;
    };

    let totalCount = getTotalCount();

    while (true) {
      for (const rule of productionRules) {
        const lhs = rule.lhs;
        const rhs = rule.rhs;
        for (let i = 0; i < rhs.length; i++) {
          const x = rhs[i];
          let beta: SyntaxSymbol[] = [];
          if (i <= rhs.length - 1) {
            beta = rhs.slice(i + 1, rhs.length);
          }

          if (
            beta.length === 0 ||
            PredictHelper.epsilon(beta, productionRules)
          ) {
            // A -> alpha B beta, beta *=> epsilon, or A -> alpha B
            const followA = result[lhs.id] ?? makeEmptySet();
            if (result[x.id] === undefined) {
              result[x.id] = makeEmptySet();
            }
            for (const followToken of followA) {
              result[x.id].add(followToken);
            }
          } else {
            // A -> alpha B beta, beta *=>/ epsilon
            const firstBeta = PredictHelper.first(
              beta,
              productionRules,
            ).symbolIdSet;
            if (result[x.id] === undefined) {
              result[x.id] = makeEmptySet();
            }

            for (const sblId of firstBeta) {
              result[x.id].add(sblId);
            }
          }
        }
      }

      const newTotalCount = getTotalCount();
      if (newTotalCount === totalCount) {
        return result;
      } else {
        totalCount = newTotalCount;
      }
    }
  }

  public static predictSet(
    productionRule: ProductionRule,
    productionRules: ProductionRule[],
  ): Set<SyntaxSymbol['id']> {
    const firstSet = PredictHelper.first(
      productionRule.rhs,
      productionRules,
    ).symbolIdSet;
    const eps = PredictHelper.epsilon(productionRule.rhs, productionRules);
    if (eps) {
      const followSetMap = PredictHelper.calculateFollowSet(productionRules);
      const followSet = followSetMap[productionRule.lhs.id];
      return SetHelper.union(firstSet, followSet);
    }

    return firstSet;
  }
}
