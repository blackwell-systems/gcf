[English](../../README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md) · **हिन्दी** · [العربية](README.ar.md)

<p align="center">
  <a href="https://gcformat.com/playground.html"><img src="https://img.shields.io/badge/playground-live-2563eb?style=for-the-badge" alt="Playground"></a>
  <a href="https://gcformat.com/guide/benchmarks.html"><img src="https://img.shields.io/badge/benchmarks-2%2C500%2B%20evals-22c55e?style=for-the-badge" alt="Benchmarks"></a>
  <a href="https://github.com/blackwell-systems/gcf"><img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/blackwell-systems/gcf/main/assets/downloads-badge.json&style=for-the-badge" alt="Downloads"></a>
  <a href="../../LICENSE"><img src="https://img.shields.io/badge/license-Apache_2.0-333?style=for-the-badge" alt="License"></a>
</p>

<p align="center">
  <img src="../../assets/gcf-hero-wire-delta.png" alt="GCF" width="760">
</p>

<h3 align="center">संरचित डेटा के लिए AI-नेटिव वायर फ़ॉर्मैट। एजेंटिक लूप के लिए बनाया गया।</h3>

<p align="center">
  <img src="../../assets/divider-wave-2.png" alt="" width="100%">
</p>

> [!IMPORTANT]
> **मूल attention अनुसंधान से रिवर्स-इंजीनियर किया गया।** Dayna Blackwell के चार शोधपत्र (2026, समीक्षाधीन):
> - [GCF: A Token-Optimized Wire Format for Structured LLM Interactions](https://doi.org/10.5281/zenodo.20579817)
> - [Tokenizer-Attention Coupling: How BPE Merge Decisions Permanently Shape Transformer Internal Organization](https://doi.org/10.5281/zenodo.20925910)
> - [Stranded Attention: BPE Tokenization Permanently Constrains Transformer Structural Capacity](https://doi.org/10.5281/zenodo.21158886)
> - [Developmental Atlas of Attention Head Specialization: Spacing, Stranding, and the Capacity Tax of BPE Tokenization](https://doi.org/10.5281/zenodo.21205389)

<p align="center">
  <img src="../../assets/divider.png" alt="" width="100%">
</p>

**GCF एजेंटिक लूप के लिए बनाया गया है, जहाँ वही संरचित संदर्भ बारी-बारी मॉडल की सीमा को बार-बार पार करता है।** एक अकेला पेलोड ही JSON से 50-92% छोटा होता है। लेकिन GCF बारी-बारी दोहराई गई संरचना को डीडुप्लिकेट भी करता है और संदर्भ बदलने पर केवल डेल्टा भेजता है, इसलिए 5वें ओवरलैपिंग कॉल तक हर प्रतिक्रिया JSON के समतुल्य की तुलना में 99% कम टोकन खर्च करती है, और पूरा 10-कॉल का सत्र हर बारी JSON को दोबारा भेजने की तुलना में 94.4% सस्ता चलता है। सत्र डीडुप और डेल्टा दोनों को लोकल ID और एक मल्टी-टर्न डिज़ाइन की ज़रूरत होती है: **JSON और TOON दोनों में से कोई भी यह बिल्कुल नहीं कर सकता।**

- **हर फ्रंटियर मॉडल पर 100% समझ**, शून्य प्रशिक्षण की आवश्यकता। संरचनात्मक रूप से जटिल कोड ग्राफ़ पर 91.2%, जहाँ TOON गिरकर 68.8% और JSON 54.1% पर आ जाता है।
- **सिद्ध रूप से लॉसलेस।** हर संरचित मान के लिए `decode(encode(value)) == value`, 5 फ़ॉर्मैट और 6 भाषाओं में 43,000,000,000+ राउंड-ट्रिप पर सत्यापित, और 17 सीरियलाइज़ेशन फ़ॉर्मैट में इंटरऑप की पुष्टि की गई। शून्य रनटाइम निर्भरताएँ, सभी सातों SDK में।
- **हर फ़ॉर्मैट के लिए एक ही कोडेक।** JSON, YAML, TOML, CSV, या MessagePack को GCF में एन्कोड करें; मॉडल इसे बिना किसी फ़ॉर्मैट निर्देश के नेटिव रूप में पढ़ता है; `decode()` इसे इनमें से किसी में वापस बदल देता है। आपके मौजूदा schema और वैलिडेटर डिकोड किए गए आउटपुट पर बिना बदलाव के काम करते हैं।

कोई अन्य अकेला फ़ॉर्मैट एक साथ ये चारों नहीं है: **schema-मुक्त** (कोई `.proto` नहीं), **लॉसलेस**, **टोकन-सघन** (JSON की तुलना में 50-92%), और शून्य प्रशिक्षण के साथ **मॉडल द्वारा पठनीय**। JSON वाचाल है, Protobuf को schema चाहिए, MessagePack बाइनरी है, और TOON चुपचाप डेटा को भ्रष्ट कर देता है (7.54% राउंड-ट्रिप विफलता, प्रति 1 करोड़ पर 176,487 मूक भ्रष्टाचार) और संरचित डेटा पर ढह जाता है (68.8% समझ, जहाँ GCF 91.2% और JSON 54.1% बनाए रखता है)। GCF को टोकनाइज़र स्तर पर डिज़ाइन किया गया है: इसके पाइप डिलिमिटर की [फ़ील्ड नामों के साथ 0% मर्ज दर है](https://gcformat.com/guide/tokenizer-analysis), जबकि JSON के व्याकरण चिह्न और TOON का टैब BPE टोकनाइज़र में मर्ज किए गए शब्दावली प्रविष्टियों के रूप में हार्डकोड हैं (TOON का टैब 32.91% सीमाओं पर आसन्न सामग्री के साथ मर्ज होता है, जो किसी भी सामान्य विभाजक में सबसे खराब है, और JSON का उद्धरण 8.17% पर), जिससे ऐसी संरचनात्मक सीमाएँ बनती हैं जिन्हें मॉडल पुनर्प्राप्त नहीं कर सकता।

```bash
pip install gcf-python                    # Python
npm install @blackwell-systems/gcf        # TypeScript
go get github.com/blackwell-systems/gcf-go  # Go
cargo add gcf                             # Rust
dotnet add package BlackwellSystems.Gcf   # .NET
```

या किसी भी मौजूदा MCP server को शून्य कोड बदलाव के साथ रैप करें:

```bash
pip install gcf-proxy
```

<p align="center">
  <img src="../../assets/divider.png" alt="" width="100%">
</p>

## बेंचमार्क

11 मॉडल, 4 प्रदाताओं, और 50+ स्वतंत्र टेस्ट रन में 2,500+ LLM मूल्यांकन।

| | Generic प्रोफ़ाइल (500 ऑर्डर) | Graph प्रोफ़ाइल (500 सिंबल) |
|---|---|---|
| **GCF** | हर फ्रंटियर मॉडल पर **100%** | **91.2%** (10 मॉडल) |
| **TOON** | लगातार सबसे कमज़ोर फ़ॉर्मैट | 68.8% |
| **JSON** | हर मॉडल पर GCF औसत >= JSON | 54.1% |

| | GCF | TOON | JSON |
|---|---|---|---|
| **टोकन दक्षता** (16 डेटासेट) | **15/16 जीतता है** | 1/16 जीतता है | 0/16 जीतता है |
| **जनरेशन** (28 रन, 11 मॉडल) | **5/5** | 1.0/5 | 5.0/5 |
| **टोकन बचत** | JSON की तुलना में **50-92%** | JSON की तुलना में 30-60% | बेसलाइन |
| **43,000,000,000+ राउंड-ट्रिप** | **0 विफलताएँ** | | |

पूर्ण परिणाम: [gcformat.com/guide/benchmarks](https://gcformat.com/guide/benchmarks.html)

### किसी भी संरचित डेटा को एन्कोड करें (generic प्रोफ़ाइल)

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

एक हेडर फ़ील्ड नाम घोषित करता है। पंक्तियाँ केवल स्थितिगत मान हैं। प्रति रिकॉर्ड फ़ील्ड नाम दोहराए नहीं जाते। लॉसलेस: हर संरचित मान के लिए `decode(encode(value)) == value`, 5 फ़ॉर्मैट और 6 भाषाओं में 43,000,000,000+ यादृच्छिक राउंड-ट्रिप पर सिद्ध।

### Graph प्रोफ़ाइल (कोड इंटेलिजेंस, नॉलेज ग्राफ़, MCP टूल)

नोड, एज, और दूरी समूहों वाले डेटा के लिए:

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

लोकल ID (`@0`, `@1`) एज में पूरे नामों की जगह लेते हैं। JSON के लिए 191 के बजाय 81 टोकन।

[![Playground](../../assets/playground.png)](https://gcformat.com/playground.html)

**[playground में इसे लाइव आज़माएँ](https://gcformat.com/playground.html)** रीयल-टाइम मल्टी-फ़ॉर्मैट तुलना के साथ। JSON, YAML, या TOML पेस्ट करें। JSON, YAML, TOML, CSV, और MessagePack से एन्कोड करें और उनमें डिकोड करें।

## यह कैसे काम करता है

### Generic प्रोफ़ाइल

लॉसलेस संरचित डेटा एन्कोडिंग। ऐरे, नेस्टेड ऑब्जेक्ट, मिश्रित प्रकार, प्रिमिटिव, रूट स्केलर। किसी भी ऐसे डेटा पर काम करता है जो ऑब्जेक्ट और ऐरे में डीसीरियलाइज़ होता है, चाहे स्रोत फ़ॉर्मैट कुछ भी हो।

1. **ऑब्जेक्ट के ऐरे।** `## name [count]{field1,field2}` फ़ील्ड नामों को एक बार घोषित करता है। पंक्तियाँ पाइप-विभाजित मान हैं। अनुपस्थित फ़ील्ड `~` का उपयोग करते हैं, null `-` का।
2. **नेस्टेड ऑब्जेक्ट।** निश्चित-आकार वाले नेस्टेड ऑब्जेक्ट को `>` पथ कॉलम में समतल किया जाता है: `"customer>name"` एक कॉलम बन जाता है, मान सीधे पंक्ति में जाते हैं। गहराई से नेस्टेड API डेटा पर 20-48% कम टोकन। परिवर्तनीय-लंबाई ऐरे और अनियमित आकार `^` अटैचमेंट फ़ॉलबैक का उपयोग करते हैं।
3. **प्रिमिटिव ऐरे।** इनलाइन: `tags[2]: admin,user`। कॉमा युक्त स्ट्रिंग को उद्धृत किया जाता है।
4. **स्केलर।** शीर्ष स्तर पर `key=value`। ऐसी स्ट्रिंग जो टाइप किए गए लिटरल (`"true"`, `"123"`, `"-"`) से टकराती हैं, स्वचालित रूप से उद्धृत की जाती हैं।
5. **रूट मान।** दस्तावेज़ रूट पर ऑब्जेक्ट, ऐरे, और स्केलर। हर JSON मान का एक GCF प्रतिनिधित्व है।

### Graph प्रोफ़ाइल

1. **स्थितिगत फ़ील्ड।** एक हेडर फ़ील्ड नाम घोषित करता है। पंक्तियाँ केवल मान हैं।
2. **लोकल ID।** `@0`, `@1`। एज पूरे पहचानकर्ताओं को दोहराने के बजाय ID से संदर्भित करते हैं।
3. **पदानुक्रमिक समूहीकरण।** सेक्शन हेडर (`## targets`, `## related`) प्रति रिकॉर्ड मेटाडेटा की जगह लेते हैं।

दोनों प्रोफ़ाइल एक ही व्याकरण साझा करते हैं (सामान्य स्केलर व्याकरण, key व्याकरण, हेडर फ़ॉर्मैट)। बचत संरचनात्मक है और पेलोड आकार के साथ बढ़ती है।

### स्ट्रीमिंग

डेटाबेस कर्सर, पेजिनेशन, और मेमोरी में रखने के लिए बहुत बड़े ग्राफ़ ट्रैवर्सल के लिए, बिना बफ़र किए, एक पेलोड को वृद्धिशील रूप से उत्सर्जित करें।

1. **आस्थगित गणना।** जब आकार अभी ज्ञात नहीं होता तो हेडर `[?]` उत्सर्जित करता है (`## edges [?]`) और पंक्तियाँ उत्पन्न होते ही स्ट्रीम हो जाती हैं।
2. **सारांश ट्रेलर।** एक समापन `##! summary symbols=8 edges=6 counts=2,1,3` स्ट्रीम समाप्त होने पर वास्तविक गणनाएँ बैकफ़िल करता है, ताकि मॉडल को फिर भी सटीक कुल मिल सकें।
3. **O(1) मेमोरी।** एन्कोडर एक बार में एक पंक्ति रखता है; एक 10,000-पंक्ति कर्सर पूरी प्रतिक्रिया को साकार करने के बजाय स्थिर मेमोरी में स्ट्रीम होता है।

TOON के टेबुलर हेडर को पहले से पंक्ति गणना चाहिए, इसलिए उसे पहले बाइट से पहले पूरे ऐरे को बफ़र करना पड़ता है; GCF गणना को स्थगित करता है और उसे अंत में भर देता है।

## समय के साथ यह सस्ता होता जाता है

**सत्र डीडुप्लिकेशन:** पिछली प्रतिक्रियाओं में भेजे गए सिंबल नंगे संदर्भ बन जाते हैं (`@7` = 2 टोकन बनाम पूर्ण घोषणा के लिए 19)। उत्पादन पैमाने पर (500 सिंबल), केवल सत्र डीडुप कॉल 5 तक 86.3% काट देता है; डेल्टा के साथ संयोजित होकर, प्रति कॉल 99.0%। एक 10-कॉल सत्र JSON की तुलना में 94.4% संचयी बचत तक पहुँचता है (हर प्रतिक्रिया 171 टोकन खर्च करती है बनाम JSON के लिए 29,072)।

**डेल्टा एन्कोडिंग:** जब क्वेरी के बीच संदर्भ थोड़ा बदलता है, तो केवल अंतर भेजें। री-क्वेरी पर 81.2% अतिरिक्त बचत।

किसी अन्य फ़ॉर्मैट में ये नहीं हैं। ये मल्टी-टर्न एजेंट इंटरैक्शन में मिलकर बढ़ते हैं।

## अनुसंधान

GCF को परीक्षण और त्रुटि से ट्यून नहीं किया गया था। इसके व्याकरण को attention-स्तर के अनुसंधान से रिवर्स-इंजीनियर किया गया कि BPE टोकनाइज़ेशन कैसे आकार देता है कि एक ट्रांसफ़ॉर्मर क्या प्रस्तुत कर सकता है, फिर नियंत्रित शुरू-से प्रशिक्षण द्वारा बाद में सत्यापित किया गया।

तंत्र: एक टोकनाइज़र के मर्ज निर्णय स्थायी रूप से एक मॉडल के आंतरिक संगठन को सीमित करते हैं। व्याकरण चिह्न जिन्हें BPE आसपास के पाठ में मोड़ देता है (JSON के उद्धरण और ब्रेस, TOON का टैब) ऐसी संरचनात्मक सीमाएँ बनाते हैं जिन्हें मॉडल स्वच्छ रूप से पुनर्प्राप्त नहीं कर सकता; फ़ील्ड नामों के विरुद्ध 0% मर्ज दर वाला एक डिलिमिटर (GCF का पाइप) ऐसा नहीं करता। डिज़ाइन इस माप से निकलता है, टोकन गणना से नहीं।

Dayna Blackwell के चार शोधपत्र (2026, वर्तमान में समीक्षाधीन) इसे स्थापित करते हैं: [GCF फ़ॉर्मैट शोधपत्र](https://doi.org/10.5281/zenodo.20579817), [Tokenizer-Attention Coupling](https://doi.org/10.5281/zenodo.20925910), [Stranded Attention](https://doi.org/10.5281/zenodo.21158886), और एक [Developmental Atlas of Attention Head Specialization](https://doi.org/10.5281/zenodo.21205389)। प्रभावों को आंतरिक रूप से और कारणात्मक रूप से मापा गया है, attention संरचना और 1.3B पैमाने पर नियंत्रित प्रशिक्षण से, न कि किसी LLM न्यायाधीश द्वारा स्कोर किया गया, इसलिए उन्हें यह कहकर टाला नहीं जा सकता कि "बेंचमार्क बस प्रशिक्षण एक्सपोज़र मापता है": GCF उन मॉडलों पर जीतता है जिन्होंने इसे कभी नहीं देखा।

पूरा तर्क [Tokenizer Analysis](https://gcformat.com/guide/tokenizer-analysis.html) और [श्वेतपत्र](https://gcformat.com/whitepaper.html) में पढ़ें।

## कार्यान्वयन

| भाषा | पैकेज | रिपॉज़िटरी |
|----------|---------|-----------|
| Go | `go get github.com/blackwell-systems/gcf-go` | [gcf-go](https://github.com/blackwell-systems/gcf-go) |
| TypeScript | `npm install @blackwell-systems/gcf` | [gcf-typescript](https://github.com/blackwell-systems/gcf-typescript) |
| Python | `pip install gcf-python` | [gcf-python](https://github.com/blackwell-systems/gcf-python) |
| Rust | `cargo add gcf` | [gcf-rust](https://github.com/blackwell-systems/gcf-rust) |
| Swift | Swift Package Manager | [gcf-swift](https://github.com/blackwell-systems/gcf-swift) |
| Kotlin | JitPack | [gcf-kotlin](https://github.com/blackwell-systems/gcf-kotlin) |
| .NET | `dotnet add package BlackwellSystems.Gcf` | [gcf-dotnet](https://github.com/blackwell-systems/gcf-dotnet) |
| MCP Proxy | `pip install gcf-proxy` | [gcf-proxy](https://github.com/blackwell-systems/gcf-proxy) (द्विदिश, सत्र डीडुप, HTTP फ्रंटएंड) |
| Claude Code Plugin | `/plugin install` | [gcf-claude-plugin](https://github.com/blackwell-systems/gcf-claude-plugin) (एक-कमांड इंस्टॉल, सत्र आँकड़े हुक) |
| Codex Plugin | `codex plugin add` | [gcf-codex-plugin](https://github.com/blackwell-systems/gcf-codex-plugin) (एक-कमांड इंस्टॉल, सत्र आँकड़े हुक) |
| VS Code | `ext install blackwell-systems.gcf-vscode` | [gcf-vscode](https://marketplace.visualstudio.com/items?itemName=blackwell-systems.gcf-vscode) (सिंटैक्स हाइलाइटिंग) |
| n8n | `npm install n8n-nodes-gcf` | [gcf-n8n-nodes](https://github.com/blackwell-systems/gcf-n8n-nodes) (वर्कफ़्लो एन्कोड/डिकोड) |
| JetBrains | Plugins में "GCF" खोजें | [gcf-jetbrains](https://github.com/blackwell-systems/gcf-jetbrains) (IntelliJ, PyCharm, WebStorm, GoLand) |
| Zed | Extensions में "GCF" खोजें | [gcf-zed](https://github.com/blackwell-systems/gcf-zed) (tree-sitter सिंटैक्स हाइलाइटिंग) |
| Tree-sitter | `npm install tree-sitter-gcf` | [tree-sitter-gcf](https://github.com/blackwell-systems/tree-sitter-gcf) |

**शून्य रनटाइम निर्भरताएँ। स्थायी रूप से।** सभी सातों कार्यान्वयन केवल अपनी भाषा की मानक लाइब्रेरी पर निर्भर करते हैं। कोई सकर्मक निर्भरता नहीं। कोई सप्लाई चेन जोखिम नहीं। यह एक स्थायी प्रतिबद्धता है: GCF कभी भी बाहरी रनटाइम निर्भरताएँ नहीं लेगा। Apache-2.0 लाइसेंस प्राप्त। सभी कार्यान्वयन generic प्रोफ़ाइल (`encodeGeneric`) और graph प्रोफ़ाइल (`encode`) दोनों का समर्थन करते हैं। मूल छह भाषा SDK में CLI शामिल है। tree-sitter के माध्यम से सिंटैक्स हाइलाइटिंग (Neovim, Helix, Zed)।

**विनिर्देश:** [SPEC v3.5.1 Stable](../../SPEC.md) 265 अनुरूपता फ़िक्स्चर के साथ, 5 फ़ॉर्मैट और 6 भाषाओं में 43,000,000,000+ लॉसलेस राउंड-ट्रिप सत्यापित। सात कार्यान्वयन (Go v1.6.2, Swift v2.6.1, .NET v0.1.0, बाकी v2.5.2)। क्रॉस-भाषा अनुरूपता सत्यापित।

## दस्तावेज़ीकरण

**[gcformat.com](https://gcformat.com/)**

- [Getting Started](https://gcformat.com/guide/getting-started.html)
- [Benchmarks](https://gcformat.com/guide/benchmarks.html)
- [Benchmarks (Full Data)](https://gcformat.com/guide/eval-results.html)
- [GCF vs TOON](https://gcformat.com/guide/vs-toon.html)
- [Schema Validation](https://gcformat.com/guide/schema-validation.html)
- [FAQ](https://gcformat.com/guide/faq.html)
- [Tokenizer Analysis](https://gcformat.com/guide/tokenizer-analysis.html) (JSON का व्याकरण BPE स्तर पर क्यों टूटता है)
- [GCF on Small Models](https://gcformat.com/guide/small-models.html) (समझ का अंतर वास्तव में कहाँ रहता है: सस्ते, लोकल, और ओपन-वेट मॉडल)
- [Playground](https://gcformat.com/playground.html)
- [Specification](../../SPEC.md)

## किसने अपनाया

| प्रोजेक्ट | |
|---------|--|
| **[Chrome DevTools MCP](https://github.com/ChromeDevTools/chrome-devtools-mcp)** | 47K★ · Google Chrome DevTools टीम का MCP server; AI कोडिंग एजेंट को लाइव ब्राउज़र स्थिति (DOM, नेटवर्क, कंसोल, प्रदर्शन) उजागर करता है |
| **[Speakeasy](https://speakeasy.com)** | OpenAPI टूलिंग (ग्राहकों में Google, Verizon, Mistral AI, DocuSign, Vercel शामिल); GCF उनके `oq` CLI में एक नेटिव आउटपुट फ़ॉर्मैट है |
| **[OmniRoute](https://omniroute.online)** | 17K★ · AI क्लाइंट और मॉडल प्रदाताओं के बीच AI गेटवे, रजिस्ट्री, और प्रॉक्सी; GCF इसके संपीड़न इंजन में वेंडर किया गया |
| **[NetClaw](https://github.com/automateyournetwork/netclaw)** | 610★ · AI-संचालित नेटवर्क स्वचालन (113 कौशल, 66 MCP एकीकरण); हर MCP server में TOON को GCF से बदला |
| **[ctx](https://github.com/stevesolun/ctx)** | 552★ · Claude Code के लिए रीयल-टाइम संदर्भ चयनकर्ता; 103K-नोड नॉलेज ग्राफ़ से केवल प्रासंगिक टूल सामने लाता है |
| **[Lynkr](https://github.com/Fast-Editor/Lynkr)** | 531★ · AI कोडिंग क्लाइंट के लिए लोकल LLM गेटवे; TOON के साथ-साथ GCF को ड्रॉप-इन टूल-परिणाम कंप्रेसर के रूप में |
| **[Open Data Products SDK](https://opendataproducts.org/sdk/)** | Linux Foundation · डेटा-उत्पाद मानकों के लिए Python टूलकिट और MCP server; एजेंट संदर्भ के लिए GCF साइडकार |
| **[NeuroNest](https://neuronest.cc)** | एजेंट-प्रथम IDE; पहला व्यावसायिक GCF अपनाव, सत्र डीडुप और डेल्टा के साथ चार एन्कोडिंग सतहों पर |
| **[Raycast](https://raycast.com/blackwell-systems/json-to-gcf-converter)** | Raycast Store में JSON-to-GCF Converter एक्सटेंशन, macOS उत्पादकता लॉन्चर के लिए |

[सभी अपनाने वालों को देखें →](https://gcformat.com/ecosystem/adopters.html)

## उपयोग के मामले

- **MCP टूल प्रतिक्रियाएँ।** कोई भी MCP server जो संरचित डेटा लौटाता है। 100% समझ सटीकता के साथ 50-92% कम टोकन।
- **एजेंट-से-एजेंट संचार।** प्रति हैंडऑफ़ 63% कम टोकन। हर फ्रंटियर मॉडल पर 5/5 जनरेशन वैधता।
- **LLM संरचित आउटपुट।** LLM 3-लाइन प्राइमर के साथ वैध GCF उत्पन्न करते हैं। कोई प्रशिक्षण आवश्यक नहीं।
- **कोड इंटेलिजेंस।** लोकल ID, एज, और दूरी समूहीकरण के साथ graph प्रोफ़ाइल।
- **मल्टी-फ़ॉर्मैट इंटरऑप।** 17 सीरियलाइज़ेशन फ़ॉर्मैट (JSON, XML, MessagePack, YAML, BSON, TOML, CBOR, Protobuf, CSV, JSON5, Avro, Arrow, Parquet, Pickle, INI, NDJSON, Plist) में लॉसलेस सत्यापित।

<details>
<summary>अधिक लिंक</summary>

- [betterthanjson.com](https://betterthanjson.com)
- [jsonalternative.com](https://jsonalternative.com)
- [betterthantoon.com](https://betterthantoon.com)

</details>

## लाइसेंस

Apache-2.0 - [Dayna Blackwell](https://github.com/blackwell-systems)
