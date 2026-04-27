import { describe, expect, it } from 'vitest';
import { parsePayrollHtmlTable } from '@/lib/payroll/parsePayrollHtmlTable';

const CAISSE_HEADER_ROW = `
<tr>
  <td><br></td>
  <td><div><span>CAISSE</span></div><div><span>LUN.</span></div></td>
  <td><div><span>CAISSE</span></div><div><span>MAR.</span></div></td>
  <td><div><span>CAISSE</span></div><div><span>MER.</span></div></td>
  <td><div><span>CAISSE</span></div><div><span>JEU.</span></div></td>
  <td><div><span>CAISSE</span></div><div><span>VEN.</span></div></td>
  <td><div><span>CAISSE</span></div><div><span>SAM.</span></div></td>
  <td><div><span>CAISSE</span></div><div><span>DIM.</span></div></td>
</tr>`;

describe('parsePayrollHtmlTable', () => {
  it('prefers legacy Médecin table when both patterns exist (stats row + shérifs)', () => {
    const caisseTable = `<table><tbody>
      ${CAISSE_HEADER_ROW}
      <tr><td><div>Tempt</div></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      </tbody></table>`;
    const legacy = `<table>
      <tr><td></td></tr>
      <tr><td>Owen Clark Médecin (5154)</td>${'<td></td><td></td>'.repeat(7)}</tr>
      <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <tr><td></td><td>Shérifs soignés</td><td>2</td><td>Patients</td><td>1</td></tr>
    </table>`;
    const out = parsePayrollHtmlTable(`${caisseTable}${legacy}`);
    expect(out.employees.length).toBeGreaterThanOrEqual(1);
    const owen = out.employees.find((e) => e.name === 'Owen Clark');
    expect(owen).toBeDefined();
    expect(owen!.role).toBe('Médecin');
  });

  it('parses caisse-only table (one column per day, no Médecin role)', () => {
    const html = `
      <table class="se-table-size-100"><tbody>
      ${CAISSE_HEADER_ROW}
      <tr>
        <td><div><strong>Peter Mccall (<span>6408</span>)</strong></div></td>
        <td><div style="text-align: center">X</div></td>
        <td><div><br></div></td>
        <td><div><br></div></td>
        <td><div><br></div></td>
        <td><div><br></div></td>
        <td><div style="text-align: center">X</div></td>
        <td><div style="text-align: center">X</div></td>
      </tr>
      </tbody></table>`;
    const out = parsePayrollHtmlTable(html);
    expect(out.employees).toHaveLength(1);
    expect(out.employees[0].name).toBe('Peter Mccall');
    expect(out.employees[0].role).toBe('');
    expect(out.employees[0].id).toBe(6408);
    expect(out.employees[0].schedule.lundi.caisse).toBe('X');
    expect(out.employees[0].schedule.mardi.caisse).toBeNull();
    expect(out.employees[0].schedule.samedi.caisse).toBe('X');
    expect(out.employees[0].schedule.dimanche.caisse).toBe('X');
    expect(out.employees[0].stats.nombre_caisses).toBe(3);
    expect(out.global_stats.total_caisses).toBe(3);
  });

  it('still parses legacy Médecin table with paired caisse/présence cells', () => {
    const dayCells =
      '<td>X</td><td></td>' +
      '<td></td><td>P</td>' +
      '<td></td><td></td>'.repeat(5);
    const html = `<table>
      <tr><td></td></tr>
      <tr><td>Alice Dupont Médecin (1001)</td>${dayCells}</tr>
      <tr><td></td><td colspan="14"></td></tr>
    </table>`;
    const out = parsePayrollHtmlTable(html);
    expect(out.employees).toHaveLength(1);
    expect(out.employees[0].name).toBe('Alice Dupont');
    expect(out.employees[0].role).toBe('Médecin');
    expect(out.employees[0].schedule.lundi.caisse).toBe('X');
    expect(out.employees[0].schedule.mardi.presence).toBe('P');
  });
});
