# Artifact: Opus 4.6 JSON Enumeration Failure

**Question:** "How many symbols have distance 1 (related)?"
**Expected answer:** 167
**Model:** Claude Opus 4.6
**Format:** JSON (500 symbols, 200 edges)

## What GCF returns for the same question

The model reads `## related [167]` from the section header. Answer: `167`. Correct.

## What JSON forced the model to do

The model had to manually scan 500 JSON objects, filter by `"Distance": 1`, and count them one by one. It enumerated 143 symbols, burned 143 lines of output tokens, and still got the wrong answer (143 vs 167).

## Raw Opus response (JSON format)

```
longest distance-0 block ends, distance-1 starts at the first symbol with Distance 1. Let me count.

Looking at the JSON, I need to count symbols where `"Distance": 1`.

Let me count systematically by scanning the Symbols array:

The distance-1 symbols start at `handler.Response.Notify` and end at `cache.ExecuteOptions` (which is distance 2).

Counting the distance-1 symbols:

From `handler.Response.Notify` through `store.DispatchConfig`, each with Distance 1.

Let me count precisely by going through the list:

1. handler.Response.Notify
2. model.SubscribeConfig
3. service.PublishOptions
4. repository.ConnectResult
5. auth.Handler.Disconnect
6. server.AuthenticateManager
7. store.AuthorizeService
8. cache.EncryptStore
9. config.Client.Decrypt
10. middleware.HashFactory
11. handler.SignBuilder
12. model.VerifyProvider
13. service.Resolver.Compress
14. repository.DecompressAdapter
15. auth.CacheRequest
16. server.EvictResponse
17. store.Config.Refresh
18. cache.HandleOptions
19. config.ProcessResult
20. middleware.ValidateHandler
21. handler.Manager.Create
22. model.UpdateService
23. auth.Factory.Set
24. server.CheckBuilder
25. cache.ParseResolver
26. store.BuildProvider
27. handler.DecodeResponse
28. middleware.EncodeRequest
29. repository.LoadResult
30. service.Options.Convert
31. store.Service.Close
32. server.InitManager
33. middleware.WriteFactory
34. config.ReadClient
35. service.ClearResolver
36. model.ResetProvider
37. server.ExecuteResponse
38. auth.Request.Dispatch
39. config.Result.Lookup
40. cache.ResolveOptions
41. middleware.FilterHandler
42. handler.SortManager
43. model.MergeService
44. service.Store.Split
45. repository.JoinClient
46. auth.MapFactory
47. server.ReduceBuilder
48. cache.WalkResolver
49. store.Provider.Scan
50. config.VisitAdapter
51. middleware.CollectRequest
52. handler.Response.Emit
53. model.NotifyConfig
54. service.SubscribeOptions
55. repository.PublishResult
56. auth.Handler.Connect
57. server.DisconnectManager
58. store.AuthenticateService
59. cache.AuthorizeStore
60. config.Client.Encrypt
61. middleware.DecryptFactory
62. handler.HashBuilder
63. model.SignProvider
64. service.Resolver.Verify
65. repository.CompressAdapter
66. auth.DecompressRequest
67. server.CacheResponse
68. store.Config.Evict
69. cache.RefreshOptions
70. config.HandleResult
71. middleware.ProcessHandler
72. handler.Manager.Validate
73. model.CreateService
74. auth.Factory.Get
75. server.SetBuilder
76. cache.BuildResolver
77. store.CheckProvider
78. handler.EncodeResponse
79. middleware.FormatRequest
80. repository.ConvertResult
81. service.Options.Transform
82. store.Service.Init
83. server.SaveManager
84. middleware.ReadFactory
85. config.OpenClient
86. service.ResetResolver
87. model.FlushProvider
88. server.DispatchResponse
89. auth.Request.Register
90. config.Result.Resolve
91. cache.InvokeOptions
92. middleware.LookupHandler
93. handler.FilterManager
94. model.SortService
95. service.Store.Merge
96. repository.SplitClient
97. auth.JoinFactory
98. server.MapBuilder
99. cache.ScanResolver
100. store.Provider.Reduce
101. config.WalkAdapter
102. middleware.VisitRequest
103. handler.Response.Collect
104. model.EmitConfig
105. service.NotifyOptions
106. repository.SubscribeResult
107. auth.Handler.Publish
108. server.ConnectManager
109. store.DisconnectService
110. cache.AuthenticateStore
111. config.Client.Authorize
112. middleware.EncryptFactory
113. handler.DecryptBuilder
114. model.HashProvider
115. service.Resolver.Sign
116. repository.VerifyAdapter
117. auth.CompressRequest
118. server.DecompressResponse
119. store.Config.Cache
120. cache.EvictOptions
121. config.RefreshResult
122. middleware.HandleHandler
123. handler.Manager.Process
124. model.ValidateService
125. service.CreateStore
126. repository.UpdateClient
127. auth.Factory.Delete
128. server.GetBuilder
129. cache.CheckResolver
130. store.SetProvider
131. handler.FormatResponse
132. middleware.ParseRequest
133. repository.TransformResult
134. service.Options.Decode
135. store.Service.Save
136. server.LoadManager
137. middleware.OpenFactory
138. config.CloseClient
139. service.FlushResolver
140. model.WriteProvider
141. server.RegisterResponse
142. auth.Request.Clear
143. store.DispatchConfig

143
```

## The point

The most capable model on earth was forced to enumerate symbols one by one because JSON provides no structural grouping. It burned 143 lines of output tokens on a manual count and still got the wrong answer (143 vs 167, missed 24 symbols). GCF answers the same question from a 3-character header lookup: `[167]`.
