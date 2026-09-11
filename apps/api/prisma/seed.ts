import bcrypt from 'bcryptjs';
import { PrismaClient, Decimal } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  await prisma.aiToolExecution.deleteMany();
  await prisma.aiConversation.deleteMany();
  await prisma.knowledgeDocument.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.inventoryItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.maintenanceWorkOrder.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.assetAssignment.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.studentGuardian.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.campus.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.userCredential.deleteMany();
  await prisma.userRole.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
  await prisma.tenant.deleteMany();

  const tenant = await prisma.tenant.create({ data: { name: 'Groupe Éducatif Atlas', slug: 'atlas' } });
  const school = await prisma.school.create({ data: { tenantId: tenant.id, name: 'École Atlas Casablanca', code: 'ATLAS-CASA', city: 'Casablanca' } });
  const campus = await prisma.campus.create({ data: { schoolId: school.id, name: 'Campus Principal', address: 'Casablanca' } });

  const permissions = await Promise.all([
    'dashboard:read', 'assets:read', 'assets:write', 'maintenance:read', 'maintenance:write', 'finance:read', 'finance:write', 'inventory:read', 'inventory:write', 'students:read', 'students:write', 'knowledge:read', 'knowledge:write', 'ai:read'
  ].map((code) => prisma.permission.create({ data: { code } })));
  const directorRole = await prisma.role.create({ data: { name: 'DIRECTOR' } });
  await prisma.rolePermission.createMany({ data: permissions.map((p) => ({ roleId: directorRole.id, permissionId: p.id })) });

  const passwordHash = await bcrypt.hash('Demo@12345', 12);
  const director = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'director@atlas-school.ma',
      firstName: 'Youssef',
      lastName: 'Bennani',
      roles: { create: { roleId: directorRole.id } },
      credential: { create: { passwordHash } }
    }
  });

  const academicYear = await prisma.academicYear.create({ data: { schoolId: school.id, label: '2026–2027', startsAt: new Date('2026-09-01'), endsAt: new Date('2027-06-30') } });
  const classes = await Promise.all(['6A', '6B', '5A', '3A'].map((name, idx) => prisma.class.create({ data: { schoolId: school.id, academicYearId: academicYear.id, name, level: `Niveau ${idx + 1}` } })));
  await prisma.staff.createMany({ data: [
    { tenantId: tenant.id, employeeCode: 'ENS-001', firstName: 'Sara', lastName: 'Idrissi', jobTitle: 'Enseignante', department: 'Pédagogie' },
    { tenantId: tenant.id, employeeCode: 'ADM-002', firstName: 'Omar', lastName: 'Alaoui', jobTitle: 'Responsable administratif', department: 'Administration' },
    { tenantId: tenant.id, employeeCode: 'TEC-003', firstName: 'Hamza', lastName: 'Naciri', jobTitle: 'Technicien', department: 'Maintenance' }
  ] });

  for (let i = 1; i <= 40; i++) {
    await prisma.student.create({ data: { tenantId: tenant.id, classId: classes[i % classes.length].id, studentCode: `ST-${String(i).padStart(4, '0')}`, firstName: `Élève${i}`, lastName: 'Atlas' } });
  }
  const seededStudents = await prisma.student.findMany({ where: { tenantId: tenant.id }, orderBy: { studentCode: 'asc' }, take: 6 });
  const guardians = await Promise.all([
    prisma.guardian.create({ data: { tenantId: tenant.id, firstName: 'Nadia', lastName: 'Bennani', phone: '+212 6 10 10 10 10', email: 'nadia.bennani@example.ma' } }),
    prisma.guardian.create({ data: { tenantId: tenant.id, firstName: 'Karim', lastName: 'Alaoui', phone: '+212 6 20 20 20 20', email: 'karim.alaoui@example.ma' } }),
    prisma.guardian.create({ data: { tenantId: tenant.id, firstName: 'Imane', lastName: 'Idrissi', phone: '+212 6 30 30 30 30', email: 'imane.idrissi@example.ma' } })
  ]);
  await prisma.studentGuardian.createMany({ data: seededStudents.slice(0,3).map((student, idx) => ({ studentId: student.id, guardianId: guardians[idx].id, relation: 'Parent' })) });

  const assets = await Promise.all([
    ['IT-001', 'MacBook Pro Direction', 'Informatique', 'Direction', 'IN_SERVICE'],
    ['IT-002', 'Dell Latitude 5440', 'Informatique', 'Salle informatique', 'IN_REPAIR'],
    ['AUDIO-01', 'Vidéoprojecteur Epson', 'Audiovisuel', 'Salle 6A', 'IN_SERVICE'],
    ['LAB-01', 'Microscope numérique', 'Laboratoire', 'Labo sciences', 'IN_SERVICE'],
    ['SEC-01', 'Caméra entrée principale', 'Sécurité', 'Entrée', 'IN_SERVICE']
  ].map(([assetCode, name, category, location, status]) => prisma.asset.create({ data: { tenantId: tenant.id, campusId: campus.id, assetCode, name, category, location, status: status as 'IN_SERVICE' | 'IN_REPAIR' | 'RETIRED' | 'LOST', qrToken: randomUUID(), purchaseAmount: new Decimal('4500') } })));

  await prisma.maintenanceRequest.createMany({ data: [
    { tenantId: tenant.id, assetId: assets[1].id, title: 'Écran et batterie à diagnostiquer', description: 'Signalement utilisateur', status: 'IN_PROGRESS', priority: 1 },
    { tenantId: tenant.id, assetId: assets[2].id, title: 'Lampe vidéoprojecteur à remplacer', status: 'OPEN', priority: 2 },
    { tenantId: tenant.id, assetId: assets[4].id, title: 'Nettoyage et contrôle annuel', status: 'ASSIGNED', priority: 3 }
  ] });

  const supplier = await prisma.supplier.create({ data: { tenantId: tenant.id, name: 'Bureau Pro Maroc', phone: '+212 5 22 00 00 00' } });
  await prisma.inventoryItem.createMany({ data: [
    { tenantId: tenant.id, supplierId: supplier.id, sku: 'SUP-PAPER-A4', name: 'Ramettes papier A4', category: 'Fournitures', unit: 'ramette', quantity: new Decimal('22'), minimumQty: new Decimal('30') },
    { tenantId: tenant.id, supplierId: supplier.id, sku: 'SUP-TONER-BR', name: 'Cartouches imprimante', category: 'Fournitures', unit: 'unité', quantity: new Decimal('3'), minimumQty: new Decimal('8') },
    { tenantId: tenant.id, supplierId: supplier.id, sku: 'SUP-MARKER', name: 'Marqueurs tableau', category: 'Fournitures', unit: 'boîte', quantity: new Decimal('18'), minimumQty: new Decimal('10') }
  ] });

  await prisma.invoice.createMany({ data: [
    { tenantId: tenant.id, number: 'FAC-2026-001', dueDate: new Date('2026-09-05'), totalAmount: new Decimal('6500'), paidAmount: new Decimal('2500'), status: 'OVERDUE' },
    { tenantId: tenant.id, number: 'FAC-2026-002', dueDate: new Date('2026-09-08'), totalAmount: new Decimal('7200'), paidAmount: new Decimal('0'), status: 'OVERDUE' },
    { tenantId: tenant.id, number: 'FAC-2026-003', dueDate: new Date('2026-09-20'), totalAmount: new Decimal('5800'), paidAmount: new Decimal('0'), status: 'ISSUED' }
  ] });
  await prisma.knowledgeDocument.create({
    data: {
      tenantId: tenant.id,
      title: 'Procédure interne — Déclaration de panne',
      sourceType: 'POLICY',
      mimeType: 'text/plain',
      content: 'Toute panne d’un équipement doit être signalée dans le registre de maintenance. Le responsable de site décrit le symptôme, indique la localisation et précise le niveau d’urgence. Une intervention prioritaire est déclenchée lorsque la sécurité, la continuité pédagogique ou un équipement critique est affecté. Toute clôture doit renseigner la cause, l’intervention réalisée et, lorsque disponible, le coût.',
      chunks: { create: [
        { chunkIndex: 0, content: 'Toute panne d’un équipement doit être signalée dans le registre de maintenance. Le responsable de site décrit le symptôme, indique la localisation et précise le niveau d’urgence.' },
        { chunkIndex: 1, content: 'Une intervention prioritaire est déclenchée lorsque la sécurité, la continuité pédagogique ou un équipement critique est affecté. Toute clôture doit renseigner la cause, l’intervention réalisée et, lorsque disponible, le coût.' }
      ] }
    },
  });
  await prisma.knowledgeDocument.create({
    data: {
      tenantId: tenant.id,
      title: 'Politique de stock — Fournitures',
      sourceType: 'POLICY',
      mimeType: 'text/plain',
      content: 'Le responsable des stocks effectue un contrôle hebdomadaire des consommables. Lorsqu’une quantité atteint ou passe sous le seuil minimum, une demande de réapprovisionnement est préparée. Les sorties de stock doivent indiquer la quantité et le motif. Les inventaires physiques sont rapprochés du stock enregistré et toute différence importante doit être documentée.',
      chunks: { create: [
        { chunkIndex: 0, content: 'Le responsable des stocks effectue un contrôle hebdomadaire des consommables. Lorsqu’une quantité atteint ou passe sous le seuil minimum, une demande de réapprovisionnement est préparée.' },
        { chunkIndex: 1, content: 'Les sorties de stock doivent indiquer la quantité et le motif. Les inventaires physiques sont rapprochés du stock enregistré et toute différence importante doit être documentée.' }
      ] }
    },
  });

  await prisma.expense.createMany({ data: [
    { tenantId: tenant.id, label: 'Maintenance informatique', category: 'Maintenance', amount: new Decimal('12500') },
    { tenantId: tenant.id, label: 'Fournitures de rentrée', category: 'Fournitures', amount: new Decimal('18300') },
    { tenantId: tenant.id, label: 'Contrat sécurité', category: 'Sécurité', amount: new Decimal('8400') }
  ] });

  console.log('Seed complete. Login: director@atlas-school.ma / Demo@12345');
  console.log(`Tenant: ${tenant.id}, Director: ${director.id}`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
