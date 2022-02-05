# 计算器

这是一个命令行界面的计算器，能进行简单的四则运算。

这是基于 Nest 框架，以及作者自己写的 Lexer (词法分析器) 和 LL(1) Parser (语法分析器) 来实现的。

## 已实现函数列表

```
Plus[x, y]                  # x+y
Minus[x, y]                 # x-y
Times[x, y]                 # x*y
Divide[x, y]                # x/y
If[x, y, z]                 # 如果 x 为真，返回 y, 否则返回 z
Take[x, y]                  # 访问 x 的第 y-1 个元素
GetHead[x]                  # 查看 x 表达式树的根节点，将根节点名称以标识符形式返回
GetParametersList[x]        # 获取 x 作为函数节点的参数列表，以列表形式返回
EqualQ[x, y]                # 若 x 等于 y, 则返回 true, 否则返回 false, 判断方式见源码
GreaterThan[x, y]           # 返回数 x 是否严格大于 y
LessThan[x, y]              # 返回数 x 是否严格小于 y
GreaterThanOrEqual[x, y]    # 返回 x 是否严格不小于 y
LessThanOrEqual[x, y]       # 返回 x 是否严格不大于 y
Sin[x]                      # 计算 x 的正弦值，将 x 视为弧度
Cos[x]                      # 计算 x 的余弦值，将 x 视为弧度
Tan[x]                      # 计算 x 的正切值，将 x 视为弧度
ArcSin[x]                   # 计算 Sin^{-1}[x], 在有定义的范围内
ArcCos[x]                   # 计算 Cos^{-1}[x], 在有定义的范围内
ArcTan[x]                   # 计算 Tan^{-1}[x], 在有定义的范围内
SinH[x]                     # 计算双曲正弦
CosH[x]                     # 计算双曲余弦
TanH[x]                     # 计算双曲正切
Exp[x]                      # 计算 e^{x}
Ln[x]                       # 计算 x 的自然对数
Lg[x]                       # 计算 x 的以 10 为底的对数
Log2[x]                     # 计算 x 的以 2 为底的对数
```

## 功能

- [x] 将输入解析成为 CST
- [x] 将 CST 翻译成中间表示
- [x] 加减乘除四则运算
- [x] 通过括号强制改变运算优先级
- [ ] 错误提示
- [ ] 变量赋值功能
- [x] 常用的初等函数（三角、对数、指数函数）
- [ ] 自定义函数功能

## 语法细节

```
PRODUCTION RULES:
S -> A | E
A -> { L }
L -> ε
L -> S L'
L' -> , S L'
L' -> ε
E -> T E'
E' -> + T E' | - T E' | ε
T -> F T'
T' -> * F T' | / F T' | ε
F -> id P | ( E ) | num
P -> ε | [ L ]
```

其中各符号含义：

```
S: 开始符号
A: 数组
E: 表达式
E: 表达式余项
L: 逗号分隔列表
L': 列表余项
T: 项
T': 余项
F: 因子
P: 函数参数部分
```
