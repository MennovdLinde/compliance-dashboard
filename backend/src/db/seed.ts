import 'dotenv/config';
import { pool } from './pool';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';

async function seed() {
  console.log('Running schema...');
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);

  console.log('Seeding users...');
  const hash = await bcrypt.hash('Demo1234!', 12);
  await pool.query(`
    INSERT INTO cd_users (email, password_hash, role, full_name, company) VALUES
      ('admin@helvetiasaas.ch',   $1, 'admin',   'Anna Müller',    'HelvetiaSaaS AG'),
      ('auditor@helvetiasaas.ch', $1, 'auditor', 'Beat Keller',    'HelvetiaSaaS AG'),
      ('viewer@helvetiasaas.ch',  $1, 'viewer',  'Claudia Huber',  'HelvetiaSaaS AG')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);

  console.log('Seeding frameworks...');
  await pool.query(`
    INSERT INTO cd_frameworks (slug, name, description, version) VALUES
      ('gdpr',     'GDPR',      'General Data Protection Regulation (EU) 2016/679', '2018'),
      ('iso27001', 'ISO 27001', 'Information Security Management System Standard',  '2022'),
      ('hipaa',    'HIPAA',     'Health Insurance Portability and Accountability Act', '2013')
    ON CONFLICT (slug) DO NOTHING
  `);

  const { rows: fw } = await pool.query('SELECT id, slug FROM cd_frameworks');
  const fwMap: Record<string, number> = {};
  fw.forEach((r: { slug: string; id: number }) => { fwMap[r.slug] = r.id; });

  console.log('Seeding GDPR controls...');
  const gdprControls = [
    ['GDPR-Art5',   'Principles of Processing',         'Data Processing',  'Ensure lawfulness, fairness, and transparency of processing.', 'compliant'],
    ['GDPR-Art6',   'Lawfulness of Processing',         'Data Processing',  'Document lawful basis for each processing activity.', 'compliant'],
    ['GDPR-Art7',   'Conditions for Consent',           'Consent',          'Obtain and record explicit consent where required.', 'partial'],
    ['GDPR-Art13',  'Information to Data Subjects',     'Transparency',     'Privacy notices must be clear, concise, and accessible.', 'compliant'],
    ['GDPR-Art17',  'Right to Erasure',                 'Data Rights',      'Implement erasure workflow within 30 days.', 'partial'],
    ['GDPR-Art20',  'Data Portability',                 'Data Rights',      'Provide data export in machine-readable format.', 'non_compliant'],
    ['GDPR-Art25',  'Privacy by Design',                'Technical',        'Embed data protection into system design.', 'compliant'],
    ['GDPR-Art30',  'Records of Processing Activities', 'Documentation',    'Maintain up-to-date ROPA register.', 'compliant'],
    ['GDPR-Art32',  'Security of Processing',           'Technical',        'Implement appropriate technical and organisational measures.', 'partial'],
    ['GDPR-Art33',  'Breach Notification',              'Incident Response','Notify DPA within 72 hours of breach discovery.', 'compliant'],
    ['GDPR-Art35',  'DPIA',                             'Risk Management',  'Conduct DPIA for high-risk processing activities.', 'partial'],
    ['GDPR-Art37',  'Data Protection Officer',          'Governance',       'Appoint DPO if required; document decision.', 'not_applicable'],
  ];

  for (const [ref, title, category, desc, status] of gdprControls) {
    await pool.query(`
      INSERT INTO cd_controls (framework_id, ref_code, title, category, description, status, owner, last_reviewed)
      VALUES ($1, $2, $3, $4, $5, $6, 'DPO Team', now() - interval '14 days')
      ON CONFLICT DO NOTHING
    `, [fwMap.gdpr, ref, title, category, desc, status]);
  }

  console.log('Seeding ISO 27001 controls...');
  const isoControls = [
    ['ISO-A.5.1',  'Policies for Information Security',  'Governance',       'Establish and review IS policies annually.', 'compliant'],
    ['ISO-A.6.1',  'Organisation of Info Security',      'Governance',       'Define roles, responsibilities, and segregation of duties.', 'compliant'],
    ['ISO-A.7.2',  'Security Awareness Training',        'HR Security',      'Annual security awareness training for all staff.', 'partial'],
    ['ISO-A.8.1',  'Inventory of Assets',                'Asset Management', 'Maintain complete and accurate asset inventory.', 'compliant'],
    ['ISO-A.9.1',  'Access Control Policy',              'Access Control',   'Implement least-privilege access control.', 'compliant'],
    ['ISO-A.9.4',  'System & App Access Control',        'Access Control',   'Enforce MFA for all privileged accounts.', 'partial'],
    ['ISO-A.10.1', 'Cryptographic Controls',             'Cryptography',     'Use AES-256 encryption for data at rest.', 'compliant'],
    ['ISO-A.11.1', 'Physical Security Perimeter',        'Physical',         'Control physical access to data processing facilities.', 'not_applicable'],
    ['ISO-A.12.1', 'Operational Procedures',             'Operations',       'Document and test operational procedures.', 'partial'],
    ['ISO-A.12.6', 'Technical Vulnerability Mgmt',       'Operations',       'Patch critical vulnerabilities within 30 days.', 'non_compliant'],
    ['ISO-A.13.1', 'Network Security Management',        'Communications',   'Segment networks; use firewall rules.', 'compliant'],
    ['ISO-A.14.2', 'Security in Dev & Support',          'Development',      'Integrate SAST/DAST in CI/CD pipeline.', 'partial'],
    ['ISO-A.16.1', 'Management of IS Incidents',         'Incident Response','Document and test incident response plan.', 'partial'],
    ['ISO-A.17.1', 'Business Continuity',                'Continuity',       'Implement and test BC/DR plan annually.', 'non_compliant'],
    ['ISO-A.18.1', 'Compliance with Legal Requirements', 'Compliance',       'Identify and meet all applicable legal obligations.', 'compliant'],
  ];

  for (const [ref, title, category, desc, status] of isoControls) {
    await pool.query(`
      INSERT INTO cd_controls (framework_id, ref_code, title, category, description, status, owner, last_reviewed)
      VALUES ($1, $2, $3, $4, $5, $6, 'Security Team', now() - interval '7 days')
      ON CONFLICT DO NOTHING
    `, [fwMap.iso27001, ref, title, category, desc, status]);
  }

  console.log('Seeding HIPAA controls...');
  const hipaaControls = [
    ['HIPAA-164.308a1', 'Risk Analysis',                     'Administrative', 'Conduct annual risk analysis of ePHI.', 'compliant'],
    ['HIPAA-164.308a3', 'Workforce Training',                'Administrative', 'Train all staff handling ePHI.', 'partial'],
    ['HIPAA-164.308a5', 'Security Awareness',                'Administrative', 'Implement security reminders and awareness program.', 'partial'],
    ['HIPAA-164.310a1', 'Facility Access Controls',          'Physical',       'Control physical access to systems with ePHI.', 'not_applicable'],
    ['HIPAA-164.310d1', 'Device & Media Controls',           'Physical',       'Implement disposal procedures for devices with ePHI.', 'compliant'],
    ['HIPAA-164.312a1', 'Access Control',                    'Technical',      'Assign unique user IDs; implement emergency access.', 'compliant'],
    ['HIPAA-164.312a2', 'Audit Controls',                    'Technical',      'Record and examine access to ePHI.', 'compliant'],
    ['HIPAA-164.312b',  'Integrity Controls',                'Technical',      'Protect ePHI from improper alteration or destruction.', 'partial'],
    ['HIPAA-164.312c1', 'Transmission Security',             'Technical',      'Encrypt ePHI in transit using TLS 1.2+.', 'compliant'],
    ['HIPAA-164.314a1', 'Business Associate Contracts',      'Organisational', 'Execute BAAs with all ePHI-handling vendors.', 'non_compliant'],
  ];

  for (const [ref, title, category, desc, status] of hipaaControls) {
    await pool.query(`
      INSERT INTO cd_controls (framework_id, ref_code, title, category, description, status, owner, last_reviewed)
      VALUES ($1, $2, $3, $4, $5, $6, 'Compliance Team', now() - interval '30 days')
      ON CONFLICT DO NOTHING
    `, [fwMap.hipaa, ref, title, category, desc, status]);
  }

  console.log('Seeding risks...');
  const risks = [
    ['Unauthorised Access to Customer PII', 'Data', 3, 5, 'open', 'Implement MFA and access reviews', fwMap.gdpr],
    ['Unpatched Critical Vulnerabilities', 'Technical', 4, 4, 'open', 'Establish 30-day patching SLA', fwMap.iso27001],
    ['Inadequate Data Retention Enforcement', 'Data', 3, 3, 'mitigated', 'Automated retention jobs deployed', fwMap.gdpr],
    ['Missing Business Associate Agreements', 'Legal', 2, 5, 'open', 'Review vendor contracts Q2 2026', fwMap.hipaa],
    ['Insider Threat — Excessive Permissions', 'Access', 3, 4, 'open', 'Quarterly access reviews', fwMap.iso27001],
    ['Ransomware / Malware Incident', 'Operational', 2, 5, 'open', 'Immutable backups + EDR deployment', fwMap.iso27001],
    ['Data Subject Rights Backlog', 'Process', 4, 3, 'open', 'Automate erasure workflow', fwMap.gdpr],
    ['Weak Password Policy in Legacy System', 'Access', 3, 3, 'mitigated', 'SSO enforced on all new services', fwMap.iso27001],
    ['No DR Plan Tested in 18+ months', 'Continuity', 3, 4, 'open', 'Schedule DR test for Q3 2026', fwMap.iso27001],
    ['ePHI Transmitted Without Encryption in Audit Logs', 'Technical', 2, 4, 'open', 'Mask sensitive fields in log output', fwMap.hipaa],
  ];

  for (const [title, category, likelihood, impact, status, mitigation, framework_id] of risks) {
    await pool.query(`
      INSERT INTO cd_risks (title, category, likelihood, impact, status, mitigation, framework_id, owner, due_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'Security Team', now() + interval '60 days')
      ON CONFLICT DO NOTHING
    `, [title, category, likelihood, impact, status, mitigation, framework_id]);
  }

  console.log('Seeding initial audit log entries...');
  const { rows: users } = await pool.query('SELECT id, email FROM cd_users');
  const adminUser = users.find((u: { email: string }) => u.email === 'admin@helvetiasaas.ch');

  await pool.query(`
    INSERT INTO cd_audit_log (actor_id, actor_email, action, entity_type, detail, ip_address)
    VALUES
      ($1, $2, 'system_init', 'system', '{"message":"Database initialised and seeded"}', '127.0.0.1'),
      ($1, $2, 'framework_created', 'framework', '{"slug":"gdpr","controls":12}', '127.0.0.1'),
      ($1, $2, 'framework_created', 'framework', '{"slug":"iso27001","controls":15}', '127.0.0.1'),
      ($1, $2, 'framework_created', 'framework', '{"slug":"hipaa","controls":10}', '127.0.0.1')
  `, [adminUser.id, adminUser.email]);

  console.log('✅ Seed complete!');
  await pool.end();
}

seed().catch(err => { console.error(err); process.exit(1); });
