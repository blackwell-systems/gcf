<template>
  <div class="matrix-band">
    <div class="matrix-wrap">
      <h2 class="matrix-title">Format Comparison</h2>
      <div class="matrix-table-wrap">
        <table class="matrix-table">
          <thead>
            <tr>
              <th></th>
              <th class="col-gcf">GCF</th>
              <th>TOON</th>
              <th>JSON</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="row-label">Token savings vs JSON</td>
              <td class="col-gcf"><span class="val win">53-71%</span></td>
              <td><span class="val">15-30%</span></td>
              <td><span class="val baseline">—</span></td>
            </tr>
            <tr>
              <td class="row-label">General comprehension</td>
              <td class="col-gcf"><span class="val win">100%</span></td>
              <td><span class="val">~100%</span></td>
              <td><span class="val">~100%</span></td>
            </tr>
            <tr>
              <td class="row-label">Adversarial comprehension</td>
              <td class="col-gcf"><span class="val win">90.7%</span></td>
              <td><span class="val lose">68.5%</span></td>
              <td><span class="val lose">53.6%</span></td>
            </tr>
            <tr>
              <td class="row-label">Lossless round-trips verified</td>
              <td class="col-gcf"><span class="val win">33B+</span></td>
              <td><span class="val lose">None published</span></td>
              <td><span class="val baseline">N/A</span></td>
            </tr>
            <tr>
              <td class="row-label">Multi-format I/O</td>
              <td class="col-gcf"><span class="val win">5 formats</span></td>
              <td><span class="val lose">JSON only</span></td>
              <td><span class="val baseline">JSON only</span></td>
            </tr>
            <tr>
              <td class="row-label">Tabular encoding</td>
              <td class="col-gcf"><span class="check">✓</span></td>
              <td><span class="check">✓</span></td>
              <td><span class="cross">✗</span></td>
            </tr>
            <tr>
              <td class="row-label">Graph encoding</td>
              <td class="col-gcf"><span class="check">✓</span></td>
              <td><span class="cross">✗</span></td>
              <td><span class="cross">✗</span></td>
            </tr>
            <tr>
              <td class="row-label">Language implementations</td>
              <td class="col-gcf"><span class="val win">6</span></td>
              <td><span class="val">10+</span></td>
              <td><span class="val baseline">Universal</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.matrix-band {
  background: #000307b3;
  padding: 40px 0;
  width: 100vw;
  position: relative;
  left: 50%;
  transform: translateX(-50%);
}

.matrix-wrap {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}

.matrix-title {
  text-align: center;
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 24px;
  text-transform: uppercase;
  letter-spacing: 0.15em;
}

.matrix-table-wrap {
  overflow-x: auto;
}

.matrix-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.matrix-table th {
  padding: 10px 16px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  border-bottom: 1px solid rgba(24, 190, 252, 0.15);
  text-align: center;
}

.matrix-table th.col-gcf {
  color: var(--gcf-blue, #18befc);
}

.matrix-table td {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  text-align: center;
}

.matrix-table td.row-label {
  text-align: left;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
}

.matrix-table td.col-gcf {
  background: rgba(24, 190, 252, 0.03);
}

.val {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

.val.win {
  color: var(--gcf-blue, #18befc);
  font-weight: 800;
}

.val.lose {
  color: rgba(255, 255, 255, 0.3);
}

.val.baseline {
  color: rgba(255, 255, 255, 0.2);
}

.check {
  color: var(--gcf-blue, #18befc);
  font-weight: 800;
  font-size: 1rem;
}

.cross {
  color: rgba(255, 255, 255, 0.15);
  font-size: 1rem;
}

@media (max-width: 640px) {
  .matrix-table {
    font-size: 0.75rem;
  }
  .matrix-table th,
  .matrix-table td {
    padding: 8px 10px;
  }
  .matrix-title {
    font-size: 1.1rem;
  }
}
</style>
