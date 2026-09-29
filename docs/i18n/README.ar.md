[English](../../README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · [हिन्दी](README.hi.md) · **العربية**

<p align="center">
  <a href="https://gcformat.com/playground.html"><img src="https://img.shields.io/badge/playground-live-2563eb?style=for-the-badge" alt="Playground"></a>
  <a href="https://gcformat.com/guide/benchmarks.html"><img src="https://img.shields.io/badge/benchmarks-2%2C500%2B%20evals-22c55e?style=for-the-badge" alt="Benchmarks"></a>
  <a href="https://github.com/blackwell-systems/gcf"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/blackwell-systems/gcf/main/assets/downloads-badge.json&style=for-the-badge" alt="Downloads"></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-333?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <img src="../../assets/gcf-hero-wire-delta.png" alt="GCF" width="760">
</p>

<h3 align="center">تنسيق الإرسال الأصيل للذكاء الاصطناعي للبيانات المهيكلة. مبني من أجل الحلقة الوكيلية.</h3>

<p align="center">
  <img src="../../assets/divider-wave-2.png" alt="" width="100%">
</p>

> [!IMPORTANT]
> **مستخلص بالهندسة العكسية من أبحاث attention الأصلية.** أربع أوراق بحثية بقلم Dayna Blackwell (2026، قيد المراجعة):
> - [GCF: A Token-Optimized Wire Format for Structured LLM Interactions](https://doi.org/10.5281/zenodo.20579817)
> - [Tokenizer-Attention Coupling: How BPE Merge Decisions Permanently Shape Transformer Internal Organization](https://doi.org/10.5281/zenodo.20925910)
> - [Stranded Attention: BPE Tokenization Permanently Constrains Transformer Structural Capacity](https://doi.org/10.5281/zenodo.21158886)
> - [Developmental Atlas of Attention Head Specialization: Spacing, Stranding, and the Capacity Tax of BPE Tokenization](https://doi.org/10.5281/zenodo.21205389)

<p align="center">
  <img src="../../assets/divider.png" alt="" width="100%">
</p>

**تم بناء GCF من أجل الحلقة الوكيلية، حيث يعبر نفس السياق المهيكل حدود النموذج دورة تلو الأخرى.** حمولة واحدة تكون بالفعل أصغر بنسبة 50-92% من JSON. لكن GCF يزيل أيضًا تكرار البنية المتكررة عبر الأدوار ويرسل الفروق (deltas) فقط عند تغير السياق، بحيث تكلف كل استجابة بحلول الاستدعاء المتداخل الخامس عددًا أقل من الرموز (tokens) بنسبة 99% مقارنةً بمكافئ JSON، وتعمل جلسة كاملة من 10 استدعاءات بتكلفة أرخص بنسبة 94.4% من إعادة إرسال JSON في كل دور. يحتاج كل من إزالة تكرار الجلسة والفرق إلى معرّفات محلية وتصميم متعدد الأدوار: **لا يستطيع JSON ولا TOON فعل هذا على الإطلاق.**

- **فهم بنسبة 100% على كل نموذج متطور**، دون الحاجة إلى أي تدريب. 91.2% على رسوم بيانية للشيفرة معقدة بنيويًا، حيث ينخفض TOON إلى 68.8% وينخفض JSON إلى 54.1%.
- **مثبت بلا فقدان.** `decode(encode(value)) == value` لكل قيمة مهيكلة، تم التحقق منه عبر 43,000,000,000+ دورة ذهاب وإياب في 5 تنسيقات و6 لغات، مع التحقق من قابلية التشغيل البيني عبر 17 تنسيق تسلسل. صفر اعتماديات وقت التشغيل، في كل الحزم البرمجية (SDKs) السبع.
- **ترميز واحد لكل تنسيق.** رمّز JSON أو YAML أو TOML أو CSV أو MessagePack إلى GCF؛ يقرأه النموذج أصليًا بلا أي تعليمات تنسيق؛ ويحوّله `decode()` مجددًا إلى أي منها. تعمل مخططاتك (schemas) ومدققاتك الحالية على المخرجات المفكوكة الترميز دون تغيير.

لا يوجد تنسيق مفرد آخر يجمع الأربعة معًا في آنٍ واحد: **خالٍ من المخطط** (لا `.proto`)، و**بلا فقدان**، و**مُدمج الرموز** (50-92% مقابل JSON)، و**قابل للقراءة من قبل النموذج** بلا تدريب. JSON مُسهب، وProtobuf يحتاج إلى مخطط، وMessagePack ثنائي، وTOON يُفسد البيانات بصمت (7.54% فشل في الذهاب والإياب، 176,487 حالة إفساد صامتة لكل 10 ملايين) وينهار على البيانات المهيكلة (68.8% فهم حيث يحافظ GCF على 91.2% وJSON على 54.1%). صُمم GCF على مستوى المُرمِّز (tokenizer): فمحدِّده ذو الخط العمودي له [معدل دمج 0% مع أسماء الحقول](https://gcformat.com/guide/tokenizer-analysis)، في حين أن رموز قواعد JSON وعلامة الجدولة (tab) في TOON مُرمَّزة بشكل ثابت كمدخلات مفردات مدموجة في مُرمِّزات BPE (تندمج علامة الجدولة في TOON مع المحتوى المجاور على 32.91% من الحدود، وهو الأسوأ بين أي فاصل شائع، بينما تندمج علامة الاقتباس في JSON على 8.17%)، مما يُنشئ حدودًا بنيوية لا يستطيع النموذج استعادتها.

```bash
pip install gcf-python                    # Python
npm install @blackwell-systems/gcf        # TypeScript
go get github.com/blackwell-systems/gcf-go  # Go
cargo add gcf                             # Rust
dotnet add package BlackwellSystems.Gcf   # .NET
```

أو غلِّف أي MCP server موجود دون أي تغييرات في الشيفرة:

```bash
pip install gcf-proxy
```

<p align="center">
  <img src="../../assets/divider.png" alt="" width="100%">
</p>

## المقاييس المرجعية

2,500+ تقييمًا لنماذج LLM عبر 11 نموذجًا و4 مزودين و50+ تشغيلة اختبار مستقلة.

| | ملف Generic (500 طلب) | ملف Graph (500 رمز) |
|---|---|---|
| **GCF** | **100%** على كل نموذج متطور | **91.2%** (10 نماذج) |
| **TOON** | التنسيق الأضعف باستمرار | 68.8% |
| **JSON** | متوسط GCF >= JSON على كل نموذج | 54.1% |

| | GCF | TOON | JSON |
|---|---|---|---|
| **كفاءة الرموز** (16 مجموعة بيانات) | **يفوز في 15/16** | يفوز في 1/16 | يفوز في 0/16 |
| **التوليد** (28 تشغيلة، 11 نموذجًا) | **5/5** | 1.0/5 | 5.0/5 |
| **توفير الرموز** | **50-92%** مقابل JSON | 30-60% مقابل JSON | خط الأساس |
| **43,000,000,000+ دورة ذهاب وإياب** | **0 حالة فشل** | | |

النتائج الكاملة: [gcformat.com/guide/benchmarks](https://gcformat.com/guide/benchmarks.html)

### رمّز أي بيانات مهيكلة (ملف generic)

```python
from gcf import encode_generic

output = encode_generic({
    "employees": [
        {"id": 1, "name": "Alice", "department": "Engineering", "salary": 95000},
        {"id": 2, "name": "Bob", "department": "Sales", "salary": 72000},
        {"id": 3, "name": "Carol", "department": "Marketing", "salary": 85000},
    ],
})
```

```
GCF profile=generic
## employees [3]{id,name,department,salary}
1|Alice|Engineering|95000
2|Bob|Sales|72000
3|Carol|Marketing|85000
```

يُعلن ترويسة واحدة أسماء الحقول. الصفوف قيم موضعية فقط. لا تتكرر أسماء الحقول لكل سجل. بلا فقدان: `decode(encode(value)) == value` لكل قيمة مهيكلة، مُثبت عبر 43,000,000,000+ دورة ذهاب وإياب عشوائية في 5 تنسيقات و6 لغات.

### ملف Graph (ذكاء الشيفرة، الرسوم البيانية المعرفية، أدوات MCP)

للبيانات ذات العقد والحواف ومجموعات المسافة:

```python
from gcf import encode, Payload, Symbol, Edge

output = encode(Payload(
    tool="context_for_task", token_budget=5000, tokens_used=1847,
    symbols=[
        Symbol(qualified_name="github.com/org/repo/pkg.AuthMiddleware", kind="function", score=0.78, provenance="lsp_resolved", distance=0),
        Symbol(qualified_name="github.com/org/repo/pkg.NewServer", kind="function", score=0.54, provenance="lsp_resolved", distance=1),
    ],
    edges=[Edge(source="github.com/org/repo/pkg.NewServer", target="github.com/org/repo/pkg.AuthMiddleware", edge_type="calls")],
))
```

```
GCF profile=graph tool=context_for_task budget=5000 tokens=1847 symbols=2 edges=1
## targets
@0 fn github.com/org/repo/pkg.AuthMiddleware 0.78 lsp_resolved
## related
@1 fn github.com/org/repo/pkg.NewServer 0.54 lsp_resolved
## edges [1]
@0<@1 calls
```

تحل المعرّفات المحلية (`@0`، `@1`) محل الأسماء الكاملة في الحواف. 81 رمزًا بدلًا من 191 لـ JSON.

[![Playground](../../assets/playground.png)](https://gcformat.com/playground.html)

**[جرّبه مباشرةً في playground](https://gcformat.com/playground.html)** مع مقارنة متعددة التنسيقات في الوقت الفعلي. ألصق JSON أو YAML أو TOML. رمّز من JSON وYAML وTOML وCSV وMessagePack وفُك الترميز إليها.

## كيف يعمل

### ملف Generic

ترميز بيانات مهيكلة بلا فقدان. مصفوفات، وكائنات متداخلة، وأنواع مختلطة، وأوليات، وقيم قياسية جذرية. يعمل على أي بيانات تُفكَّك تسلسليًا إلى كائنات ومصفوفات، بصرف النظر عن تنسيق المصدر.

1. **مصفوفات الكائنات.** `## name [count]{field1,field2}` يُعلن أسماء الحقول مرة واحدة. الصفوف قيم مفصولة بخط عمودي. الحقول الغائبة تستخدم `~`، وnull تستخدم `-`.
2. **الكائنات المتداخلة.** الكائنات المتداخلة ذات الشكل الثابت تُسطّح إلى أعمدة مسار `>`: يصبح `"customer>name"` عمودًا، وتذهب القيم مباشرةً في الصف. رموز أقل بنسبة 20-48% على بيانات API العميقة التداخل. تستخدم المصفوفات متغيرة الطول والأشكال غير المنتظمة آلية الإرفاق الاحتياطية `^`.
3. **مصفوفات الأوليات.** مُضمّنة: `tags[2]: admin,user`. السلاسل النصية المحتوية على فواصل تُقتبس.
4. **القيم القياسية.** `key=value` على المستوى الأعلى. السلاسل التي تتصادم مع القيم الحرفية المُصنّفة (`"true"`، `"123"`، `"-"`) تُقتبس تلقائيًا.
5. **القيم الجذرية.** الكائنات والمصفوفات والقيم القياسية في جذر المستند. لكل قيمة JSON تمثيل في GCF.

### ملف Graph

1. **الحقول الموضعية.** ترويسة واحدة تُعلن أسماء الحقول. الصفوف قيم فقط.
2. **المعرّفات المحلية.** `@0`، `@1`. تشير الحواف بالمعرّف، لا بتكرار المعرّفات الكاملة.
3. **التجميع الهرمي.** ترويسات الأقسام (`## targets`، `## related`) تحل محل بيانات التعريف لكل سجل.

يتشارك الملفان القواعد نفسها (قواعد القيم القياسية المشتركة، وقواعد المفاتيح، وتنسيق الترويسة). التوفير بنيوي وينمو مع حجم الحمولة.

### التدفق

أصدِر حمولة بشكل تراكمي، دون تخزينها مؤقتًا، لمؤشرات قواعد البيانات، وترقيم الصفحات، واجتيازات الرسوم البيانية الأكبر من أن تُحتفظ في الذاكرة.

1. **الأعداد المؤجلة.** تُصدر الترويسة `[?]` عندما لا يكون الحجم معروفًا بعد (`## edges [?]`) وتتدفق الصفوف مع إنتاجها.
2. **ذيل الملخص.** ذيل ختامي `##! summary symbols=8 edges=6 counts=2,1,3` يعبّئ الأعداد الحقيقية بأثر رجعي بمجرد انتهاء التدفق، بحيث يحصل النموذج على المجاميع الدقيقة.
3. **ذاكرة O(1).** يحتفظ المُرمِّز بصف واحد في كل مرة؛ فمؤشر من 10,000 صف يتدفق في ذاكرة ثابتة بدلًا من تجسيد الاستجابة بأكملها.

تتطلب الترويسة الجدولية لـ TOON عدد الصفوف مقدمًا، لذا يجب أن تُخزّن المصفوفة كاملة مؤقتًا قبل أول بايت؛ أما GCF فيؤجل العدد ويملؤه في النهاية.

## يصبح أرخص مع مرور الوقت

**إزالة تكرار الجلسة:** الرموز المُرسلة في استجابات سابقة تصبح مراجع مجردة (`@7` = رمزان مقابل 19 للإعلان الكامل). على نطاق الإنتاج (500 رمز)، تخفض إزالة تكرار الجلسة وحدها 86.3% بحلول الاستدعاء الخامس؛ ومركبةً مع الفرق، 99.0% لكل استدعاء. تصل جلسة من 10 استدعاءات إلى توفير تراكمي بنسبة 94.4% مقابل JSON (تكلف كل استجابة 171 رمزًا مقابل 29,072 لـ JSON).

**ترميز الفرق:** عندما يتغير السياق قليلًا بين الاستعلامات، أرسل الفرق فقط. توفير إضافي بنسبة 81.2% على إعادة الاستعلامات.

لا يمتلك أي تنسيق آخر هذه القدرات. إنها تتراكم عبر تفاعلات الوكيل متعددة الأدوار.

## الأبحاث

لم يُضبط GCF بالتجربة والخطأ. بل استُخلصت قواعده بالهندسة العكسية من أبحاث على مستوى attention حول كيفية تشكيل ترميز BPE لما يمكن للمحوّل (transformer) أن يمثّله، ثم تم التحقق منها لاحقًا بتدريب من الصفر مضبوط.

الآلية: قرارات الدمج في المُرمِّز تُقيّد بشكل دائم التنظيم الداخلي للنموذج. رموز القواعد التي يطويها BPE داخل النص المحيط (علامات الاقتباس والأقواس في JSON، وعلامة الجدولة في TOON) تُنشئ حدودًا بنيوية لا يستطيع النموذج استعادتها بنقاء؛ أما المحدِّد ذو معدل دمج 0% مقابل أسماء الحقول (الخط العمودي في GCF) فلا يفعل. ينبثق التصميم من هذا القياس، لا من عدّ الرموز.

أربع أوراق بحثية بقلم Dayna Blackwell (2026، قيد المراجعة حاليًا) تُثبت ذلك: [ورقة تنسيق GCF](https://doi.org/10.5281/zenodo.20579817)، و[Tokenizer-Attention Coupling](https://doi.org/10.5281/zenodo.20925910)، و[Stranded Attention](https://doi.org/10.5281/zenodo.21158886)، و[Developmental Atlas of Attention Head Specialization](https://doi.org/10.5281/zenodo.21205389). قِيست التأثيرات جوهريًا وسببيًا، من بنية attention والتدريب المضبوط على نطاق 1.3B، لا بتقييم قاضٍ من نوع LLM، لذا لا يمكن تفسيرها بأنها «المقياس المرجعي يقيس مجرد التعرض أثناء التدريب»: يفوز GCF على نماذج لم ترَه قط.

اقرأ الحجة كاملةً في [Tokenizer Analysis](https://gcformat.com/guide/tokenizer-analysis.html) و[الورقة البيضاء](https://gcformat.com/whitepaper.html).

## عمليات التنفيذ

| اللغة | الحزمة | المستودع |
|----------|---------|-----------|
| Go | `go get github.com/blackwell-systems/gcf-go` | [gcf-go](https://github.com/blackwell-systems/gcf-go) |
| TypeScript | `npm install @blackwell-systems/gcf` | [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) |
| Python | `pip install gcf-python` | [gcf-python](https://github.com/blackwell-systems/gcf-python) |
| Rust | `cargo add gcf` | [gcf-rust](https://github.com/blackwell-systems/gcf-rust) |
| Swift | Swift Package Manager | [gcf-swift](https://github.com/blackwell-systems/gcf-swift) |
| Kotlin | JitPack | [gcf-kotlin](https://github.com/blackwell-systems/gcf-kotlin) |
| .NET | `dotnet add package BlackwellSystems.Gcf` | [gcf-dotnet](https://github.com/blackwell-systems/gcf-dotnet) |
| MCP Proxy | `pip install gcf-proxy` | [gcf-proxy](https://github.com/blackwell-systems/gcf-proxy) (ثنائي الاتجاه، إزالة تكرار الجلسة، واجهة HTTP أمامية) |
| Claude Code Plugin | `/plugin install` | [gcf-claude-plugin](https://github.com/blackwell-systems/gcf-claude-plugin) (تثبيت بأمر واحد، خطاف إحصائيات الجلسة) |
| Codex Plugin | `codex plugin add` | [gcf-codex-plugin](https://github.com/blackwell-systems/gcf-codex-plugin) (تثبيت بأمر واحد، خطاف إحصائيات الجلسة) |
| VS Code | `ext install blackwell-systems.gcf-vscode` | [gcf-vscode](https://marketplace.visualstudio.com/items?itemName=blackwell-systems.gcf-vscode) (تمييز بناء الجملة) |
| n8n | `npm install n8n-nodes-gcf` | [gcf-n8n-nodes](https://github.com/blackwell-systems/gcf-n8n-nodes) (ترميز/فك ترميز في سير العمل) |
| JetBrains | ابحث عن "GCF" في Plugins | [gcf-jetbrains](https://github.com/blackwell-systems/gcf-jetbrains) (IntelliJ، PyCharm، WebStorm، GoLand) |
| Zed | ابحث عن "GCF" في Extensions | [gcf-zed](https://github.com/blackwell-systems/gcf-zed) (تمييز بناء الجملة عبر tree-sitter) |
| Tree-sitter | `npm install tree-sitter-gcf` | [tree-sitter-gcf](https://github.com/blackwell-systems/tree-sitter-gcf) |

**صفر اعتماديات وقت التشغيل. بشكل دائم.** تعتمد كل عمليات التنفيذ السبع على المكتبة القياسية للغتها فقط. لا اعتماديات متعدية. لا مخاطر لسلسلة التوريد. هذا التزام دائم: لن يتبنى GCF أبدًا اعتماديات خارجية لوقت التشغيل. مرخّص بموجب Apache-2.0. تدعم كل عمليات التنفيذ ملف generic (`encodeGeneric`) وملف graph (`encode`) معًا. واجهة سطر الأوامر مضمّنة في الحزم البرمجية الست الأصلية. تمييز بناء الجملة عبر tree-sitter (Neovim، Helix، Zed).

**المواصفة:** [SPEC v3.5.1 Stable](../../SPEC.md) مع 265 تركيبة اختبار مطابقة، و43,000,000,000+ دورة ذهاب وإياب بلا فقدان تم التحقق منها عبر 5 تنسيقات و6 لغات. سبع عمليات تنفيذ (Go v1.6.2، Swift v2.6.1، .NET v0.1.0، والبقية v2.5.2). تم التحقق من المطابقة عبر اللغات.

## التوثيق

**[gcformat.com](https://gcformat.com/)**

- [Getting Started](https://gcformat.com/guide/getting-started.html)
- [Benchmarks](https://gcformat.com/guide/benchmarks.html)
- [Benchmarks (Full Data)](https://gcformat.com/guide/eval-results.html)
- [GCF vs TOON](https://gcformat.com/guide/vs-toon.html)
- [Schema Validation](https://gcformat.com/guide/schema-validation.html)
- [FAQ](https://gcformat.com/guide/faq.html)
- [Tokenizer Analysis](https://gcformat.com/guide/tokenizer-analysis.html) (لماذا تنكسر قواعد JSON على مستوى BPE)
- [GCF on Small Models](https://gcformat.com/guide/small-models.html) (أين تكمن فجوة الفهم فعليًا: النماذج الرخيصة والمحلية والمفتوحة الأوزان)
- [Playground](https://gcformat.com/playground.html)
- [Specification](../../SPEC.md)

## من تبنّاه

| المشروع | |
|---------|--|
| **[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)** | 47K★ · MCP server من فريق Google Chrome DevTools؛ يكشف حالة المتصفح الحية (DOM، الشبكة، وحدة التحكم، الأداء) لوكلاء الذكاء الاصطناعي للبرمجة |
| **[Speakeasy](https://speakeasy.com)** | أدوات OpenAPI (من عملائها Google وVerizon وMistral AI وDocuSign وVercel)؛ GCF تنسيق إخراج أصيل في واجهة `oq` الخاصة بها |
| **[OmniRoute](https://omniroute.online)** | 17K★ · بوابة وسجل ووكيل للذكاء الاصطناعي بين عملاء الذكاء الاصطناعي ومزودي النماذج؛ GCF مدمج في محرك الضغط الخاص به |
| **[NetClaw](https://github.com/automateyournetwork/netclaw)** | 610★ · أتمتة شبكات مدعومة بالذكاء الاصطناعي (113 مهارة، 66 تكامل MCP)؛ استبدل TOON بـ GCF عبر كل MCP server |
| **[ctx](https://github.com/stevesolun/ctx)** | 552★ · مُنتقي سياق في الوقت الفعلي لـ Claude Code؛ يُبرز الأدوات ذات الصلة فقط من رسم بياني معرفي بـ 103K عقدة |
| **[Lynkr](https://github.com/Fast-Editor/Lynkr)** | 531★ · بوابة LLM محلية لعملاء الذكاء الاصطناعي للبرمجة؛ GCF كضاغط لنتائج الأدوات قابل للاستبدال المباشر إلى جانب TOON |
| **[Open Data Products SDK](https://opendataproducts.org/sdk/)** | Linux Foundation · مجموعة أدوات Python وMCP server لمعايير منتجات البيانات؛ ملحقات GCF جانبية لسياق الوكيل |
| **[NeuroNest](https://neuronest.cc)** | بيئة تطوير متكاملة تعطي الأولوية للوكيل؛ أول تبنٍّ تجاري لـ GCF، عبر أربعة أسطح ترميز مع إزالة تكرار الجلسة والفرق |
| **[Raycast](https://raycast.com/blackwell-systems/json-to-gcf-converter)** | امتداد JSON-to-GCF Converter في متجر Raycast، لمُشغّل إنتاجية macOS |

[شاهد جميع المتبنّين →](https://gcformat.com/ecosystem/adopters.html)

## حالات الاستخدام

- **استجابات أدوات MCP.** أي MCP server يُعيد بيانات مهيكلة. رموز أقل بنسبة 50-92% بدقة فهم 100%.
- **التواصل بين الوكلاء.** رموز أقل بنسبة 63% لكل عملية تسليم. صلاحية توليد 5/5 على كل نموذج متطور.
- **المخرجات المهيكلة لـ LLM.** تُنتج نماذج LLM بيانات GCF صالحة بتمهيد من 3 أسطر. لا حاجة إلى تدريب.
- **ذكاء الشيفرة.** ملف graph مع معرّفات محلية وحواف وتجميع بالمسافة.
- **التشغيل البيني متعدد التنسيقات.** تم التحقق منه بلا فقدان عبر 17 تنسيق تسلسل (JSON، XML، MessagePack، YAML، BSON، TOML، CBOR، Protobuf، CSV، JSON5، Avro، Arrow، Parquet، Pickle، INI، NDJSON، Plist).

<details>
<summary>مزيد من الروابط</summary>

- [betterthanjson.com](https://betterthanjson.com)
- [jsonalternative.com](https://jsonalternative.com)
- [betterthantoon.com](https://betterthantoon.com)

</details>

## الترخيص

Apache-2.0 - [Dayna Blackwell](https://github.com/blackwell-systems)
