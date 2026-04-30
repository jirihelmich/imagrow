import { useCallback } from 'react';
import lf from 'lovefield';
import dayjs from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { urlSlug } from '../utils/slug';
import { cmToMm } from '../utils/formatting';
import type { PatientWithPerson, PatientDetail, PatientWithExamination } from '../types/database';

export interface PatientFormData {
  id?: number;
  personId?: number;
  motherId?: number;
  fatherId?: number;
  birthNumber: string;
  gender: string;
  birthWeight: number;
  birthWeek: number;
  expectedBirthDate: string;
  firstname?: string;
  lastname?: string;
  description?: string;
  birthLength?: string | number;
  birthHeadCircumference?: string | number;
  address: { id?: number; street?: string | null; city?: string | null; country?: string | null; zipcode?: string | null };
  titlePrefix?: string;
  titlePostfix?: string;
}

export interface ParentFormData {
  id?: number;
  birthNumber?: string;
  gender: string;
  firstname?: string;
  lastname?: string;
  weight?: number;
  length?: string | number;
  headCircumference?: string | number;
  description?: string;
  phone?: string;
  email?: string;
  address: { id?: number; street?: string | null; city?: string | null; country?: string | null; zipcode?: string | null };
}

function buildPerson(data: PatientFormData | ParentFormData, id?: number) {
  return {
    id,
    birthNumber: ((data.birthNumber || '').replace('/', '').replace(' ', '')),
    gender: data.gender,
    titlePrefix: ('titlePrefix' in data ? data.titlePrefix : undefined) || null,
    titlePostfix: ('titlePostfix' in data ? data.titlePostfix : undefined) || null,
    firstName: data.firstname || null,
    lastName: data.lastname || null,
    firstNameSearchable: urlSlug(data.firstname || '').toLowerCase(),
    lastNameSearchable: urlSlug(data.lastname || '').toLowerCase(),
    email: ('email' in data ? data.email : undefined) || null,
    phone: ('phone' in data ? data.phone : undefined) || null,
    description: data.description || null,
    weight: ('weight' in data ? data.weight : undefined) || null,
    length: ('length' in data ? cmToMm(data.length) : undefined) || null,
    headCircumference: ('headCircumference' in data ? cmToMm(data.headCircumference) : undefined) || null,
  };
}

export function usePatients() {
  const { db } = useDatabase();
  const { currentUser } = useAuth();

  const createOrUpdate = useCallback(async (
    patient: PatientFormData,
    mother: ParentFormData,
    father: ParentFormData,
  ) => {
    if (!db || !currentUser) throw new Error('Not ready');

    async function persistPerson(
      data: PatientFormData | ParentFormData,
      personId: number | undefined,
      patientData?: { id?: number; birthWeek: number; expectedBirthDate: string; birthWeight: number; birthLength?: string | number; birthHeadCircumference?: string | number },
    ): Promise<Record<string, unknown>> {
      const addressTable = db!.getSchema().table('Address');
      const addressRow = addressTable.createRow(data.address as Record<string, unknown>);
      const [address] = await db!.insertOrReplace().into(addressTable).values([addressRow]).exec() as Record<string, unknown>[];

      const personTable = db!.getSchema().table('Person');
      const person = buildPerson(data, personId);
      (person as Record<string, unknown>).addressId = (address as Record<string, unknown>).id;
      const personRow = personTable.createRow(person as Record<string, unknown>);
      const [savedPerson] = await db!.insertOrReplace().into(personTable).values([personRow]).exec() as Record<string, unknown>[];

      if (!patientData) return savedPerson;

      const patientTable = db!.getSchema().table('Patient');
      const patientRow = patientTable.createRow({
        id: patientData.id,
        personId: (savedPerson as Record<string, unknown>).id,
        motherId: motherPersonId,
        fatherId: fatherPersonId,
        doctorId: currentUser!.id,
        isActive: true,
        birthWeek: patientData.birthWeek,
        expectedBirthDate: dayjs(patientData.expectedBirthDate, 'D. M. YYYY').toDate(),
        birthWeight: patientData.birthWeight,
        birthLength: cmToMm(patientData.birthLength),
        birthHeadCircumference: cmToMm(patientData.birthHeadCircumference),
      });
      const [savedPatient] = await db!.insertOrReplace().into(patientTable).values([patientRow]).exec() as Record<string, unknown>[];
      return savedPatient;
    }

    // Persist parents first (sequentially to capture IDs)
    const motherResult: Record<string, unknown> = await persistPerson(mother, patient.motherId);
    const motherPersonId: number = motherResult.id as number;

    const fatherResult: Record<string, unknown> = await persistPerson(father, patient.fatherId);
    const fatherPersonId: number = fatherResult.id as number;

    // Now persist the child with parent IDs
    const result = await persistPerson(patient, patient.personId, {
      id: patient.id,
      birthWeek: patient.birthWeek,
      expectedBirthDate: patient.expectedBirthDate,
      birthWeight: patient.birthWeight,
      birthLength: patient.birthLength,
      birthHeadCircumference: patient.birthHeadCircumference,
    });

    return [result];
  }, [db, currentUser]);

  const getById = useCallback(async (id: number): Promise<PatientWithExamination | null> => {
    if (!db || !currentUser) return null;

    const patientTable = db.getSchema().table('Patient');
    const personTable = db.getSchema().table('Person');
    const examinationTable = db.getSchema().table('Examination');
    const motherTable = db.getSchema().table('Person').as('Mother');
    const motherAddressTable = db.getSchema().table('Address').as('MotherAddress');
    const fatherTable = db.getSchema().table('Person').as('Father');
    const fatherAddressTable = db.getSchema().table('Address').as('FatherAddress');

    const results = await db.select()
      .from(patientTable)
      .innerJoin(personTable, personTable['id'].eq(patientTable['personId']))
      .leftOuterJoin(examinationTable, examinationTable['patientId'].eq(patientTable['id']))
      .innerJoin(motherTable, motherTable['id'].eq(patientTable['motherId']))
      .innerJoin(fatherTable, fatherTable['id'].eq(patientTable['fatherId']))
      .innerJoin(motherAddressTable, motherAddressTable['id'].eq(motherTable['addressId']))
      .innerJoin(fatherAddressTable, fatherAddressTable['id'].eq(fatherTable['addressId']))
      .where(lf.op.and(
        patientTable['doctorId'].eq(currentUser.id),
        patientTable['id'].eq(id),
      ))
      .orderBy(examinationTable['dateTime'], lf.Order.DESC)
      .limit(1)
      .exec();

    return results.length > 0 ? (results[0] as unknown as PatientWithExamination) : null;
  }, [db, currentUser]);

  const getDetail = useCallback(async (id: number): Promise<PatientDetail | null> => {
    if (!db || !currentUser) return null;

    const patientTable = db.getSchema().table('Patient');
    const personTable = db.getSchema().table('Person');
    const motherTable = db.getSchema().table('Person').as('Mother');
    const motherAddressTable = db.getSchema().table('Address').as('MotherAddress');
    const fatherTable = db.getSchema().table('Person').as('Father');
    const fatherAddressTable = db.getSchema().table('Address').as('FatherAddress');

    const results = await db.select()
      .from(patientTable)
      .innerJoin(personTable, personTable['id'].eq(patientTable['personId']))
      .innerJoin(motherTable, motherTable['id'].eq(patientTable['motherId']))
      .innerJoin(fatherTable, fatherTable['id'].eq(patientTable['fatherId']))
      .innerJoin(motherAddressTable, motherAddressTable['id'].eq(motherTable['addressId']))
      .innerJoin(fatherAddressTable, fatherAddressTable['id'].eq(fatherTable['addressId']))
      .where(lf.op.and(
        patientTable['doctorId'].eq(currentUser.id),
        patientTable['id'].eq(id),
      ))
      .exec();

    return results.length > 0 ? (results[0] as unknown as PatientDetail) : null;
  }, [db, currentUser]);

  const deleteById = useCallback(async (id: number): Promise<void> => {
    if (!db || !currentUser) return;
    const patientTable = db.getSchema().table('Patient');
    await db.delete().from(patientTable)
      .where(lf.op.and(
        patientTable['doctorId'].eq(currentUser.id),
        patientTable['id'].eq(id),
      ))
      .exec();
  }, [db, currentUser]);

  const search = useCallback(async (token: string, count: number): Promise<PatientWithPerson[]> => {
    if (!db || !currentUser) return [];

    const patientTable = db.getSchema().table('Patient');
    const personTable = db.getSchema().table('Person');

    const trimmed = token.trim();
    if (!trimmed) return [];

    const conditions: ReturnType<typeof personTable['birthNumber']['match']>[] = [];

    const dateMatch = trimmed.match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{2,4})$/);
    if (dateMatch) {
      const day = parseInt(dateMatch[1]);
      const month = parseInt(dateMatch[2]);
      let year = parseInt(dateMatch[3]);
      if (year >= 1000) year = year % 100;
      const yy = String(year).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const monthVariants = [month, month + 20, month + 50, month + 70]
        .map((m) => String(m).padStart(2, '0'));
      const dateRegex = new RegExp(`^${yy}(${monthVariants.join('|')})${dd}`);
      conditions.push(personTable['birthNumber'].match(dateRegex));
    } else {
      const tokens = trimmed.split(/\s+/).filter(Boolean);
      for (const t of tokens) {
        const digitsOnly = t.replace(/\D/g, '');
        if (digitsOnly.length >= 4) {
          conditions.push(personTable['birthNumber'].match(new RegExp(digitsOnly)));
        }
        const slug = urlSlug(t);
        if (slug) {
          conditions.push(personTable['lastNameSearchable'].match(new RegExp(slug)));
          conditions.push(personTable['firstNameSearchable'].match(new RegExp(slug)));
        }
      }
    }

    if (conditions.length === 0) return [];
    const combined = conditions.length === 1 ? conditions[0] : lf.op.or(...conditions);

    const results = await db.select()
      .from(patientTable)
      .innerJoin(personTable, personTable['id'].eq(patientTable['personId']))
      .where(lf.op.and(patientTable['doctorId'].eq(currentUser.id), combined))
      .orderBy(patientTable['id'], lf.Order.DESC)
      .limit(count)
      .exec();

    return results as unknown as PatientWithPerson[];
  }, [db, currentUser]);

  const recent = useCallback(async (count: number): Promise<PatientWithPerson[]> => {
    if (!db || !currentUser) return [];

    const patientTable = db.getSchema().table('Patient');
    const personTable = db.getSchema().table('Person');

    const results = await db.select()
      .from(patientTable)
      .innerJoin(personTable, personTable['id'].eq(patientTable['personId']))
      .where(patientTable['doctorId'].eq(currentUser.id))
      .orderBy(patientTable['id'], lf.Order.DESC)
      .limit(count)
      .exec();

    return results as unknown as PatientWithPerson[];
  }, [db, currentUser]);

  const count = useCallback(async (): Promise<number> => {
    if (!db || !currentUser) return 0;
    const patientTable = db.getSchema().table('Patient');
    const result = await db.select(lf.fn.count(patientTable['id']))
      .from(patientTable)
      .where(patientTable['doctorId'].eq(currentUser.id))
      .exec() as unknown as Record<string, number>[];
    const row = result[0];
    return row ? Number(Object.values(row)[0]) : 0;
  }, [db, currentUser]);

  const findByIds = useCallback(async (ids: number[]): Promise<PatientWithPerson[]> => {
    if (!db || !currentUser || ids.length === 0) return [];
    const patientTable = db.getSchema().table('Patient');
    const personTable = db.getSchema().table('Person');
    const results = await db.select()
      .from(patientTable)
      .innerJoin(personTable, personTable['id'].eq(patientTable['personId']))
      .where(lf.op.and(patientTable['doctorId'].eq(currentUser.id), patientTable['id'].in(ids)))
      .exec();
    return results as unknown as PatientWithPerson[];
  }, [db, currentUser]);

  const all = useCallback(async (): Promise<PatientWithPerson[]> => {
    if (!db || !currentUser) return [];

    const patientTable = db.getSchema().table('Patient');
    const personTable = db.getSchema().table('Person');

    const results = await db.select()
      .from(patientTable)
      .innerJoin(personTable, personTable['id'].eq(patientTable['personId']))
      .where(patientTable['doctorId'].eq(currentUser.id))
      .orderBy(personTable['lastName'], lf.Order.ASC)
      .exec();

    return results as unknown as PatientWithPerson[];
  }, [db, currentUser]);

  const exportDB = useCallback(async (): Promise<void> => {
    if (!db) return;
    const data = await db.export();
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'auxology-export.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }, [db]);

  return { createOrUpdate, getById, getDetail, deleteById, search, recent, all, exportDB, count, findByIds };
}
