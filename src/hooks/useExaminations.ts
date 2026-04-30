import { useCallback } from 'react';
import lf from 'lovefield';
import dayjs from 'dayjs';
import { useDatabase } from '../contexts/DatabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { numerize, cmToMm } from '../utils/formatting';
import type { Examination } from '../types/database';

export interface ExaminationFormData {
  id?: number;
  dateTime: string;
  weight: string | number;
  length: string | number;
  headCircumference: string | number;
  description?: string;
  image?: unknown;
}

export function useExaminations() {
  const { db } = useDatabase();
  const { currentUser } = useAuth();

  const createOrUpdate = useCallback(async (patientId: number, examination: ExaminationFormData): Promise<Examination[]> => {
    if (!db || !currentUser) throw new Error('Not ready');

    const examinationTable = db.getSchema().table('Examination');
    const data = {
      id: examination.id,
      doctorId: currentUser.id,
      patientId,
      length: cmToMm(examination.length),
      description: examination.description || null,
      headCircumference: cmToMm(examination.headCircumference),
      weight: numerize(examination.weight),
      dateTime: dayjs(examination.dateTime, ['D. M. YYYY H:m', 'D. M. YYYY']).toDate(),
      image: examination.image || null,
    };

    const row = examinationTable.createRow(data);
    const result = await db.insertOrReplace().into(examinationTable).values([row]).exec();
    return result as unknown as Examination[];
  }, [db, currentUser]);

  const getById = useCallback(async (id: number): Promise<Examination | null> => {
    if (!db || !currentUser) return null;
    const t = db.getSchema().table('Examination');
    const results = await db.select().from(t)
      .where(lf.op.and(t['doctorId'].eq(currentUser.id), t['id'].eq(id)))
      .limit(1).exec();
    return results.length > 0 ? (results[0] as unknown as Examination) : null;
  }, [db, currentUser]);

  const deleteById = useCallback(async (id: number): Promise<void> => {
    if (!db || !currentUser) return;
    const t = db.getSchema().table('Examination');
    await db.delete().from(t)
      .where(lf.op.and(t['doctorId'].eq(currentUser.id), t['id'].eq(id)))
      .exec();
  }, [db, currentUser]);

  const getAllByPatient = useCallback(async (patientId: number): Promise<Examination[]> => {
    if (!db || !currentUser) return [];
    const t = db.getSchema().table('Examination');
    const results = await db.select().from(t)
      .where(lf.op.and(t['doctorId'].eq(currentUser.id), t['patientId'].eq(patientId)))
      .orderBy(t['dateTime'], lf.Order.DESC)
      .exec();
    return results as unknown as Examination[];
  }, [db, currentUser]);

  const getLatestPerPatient = useCallback(async (): Promise<Map<number, Date>> => {
    if (!db || !currentUser) return new Map();
    const t = db.getSchema().table('Examination');
    const results = await db.select().from(t)
      .where(t['doctorId'].eq(currentUser.id))
      .orderBy(t['dateTime'], lf.Order.DESC)
      .exec() as unknown as Examination[];
    const latest = new Map<number, Date>();
    for (const row of results) {
      if (!latest.has(row.patientId)) latest.set(row.patientId, row.dateTime);
    }
    return latest;
  }, [db, currentUser]);

  const countSince = useCallback(async (since: Date): Promise<number> => {
    if (!db || !currentUser) return 0;
    const t = db.getSchema().table('Examination');
    const result = await db.select(lf.fn.count(t['id']))
      .from(t)
      .where(lf.op.and(t['doctorId'].eq(currentUser.id), t['dateTime'].gte(since)))
      .exec() as unknown as { COUNT: number }[];
    const row = result[0] as Record<string, number> | undefined;
    return row ? Number(Object.values(row)[0]) : 0;
  }, [db, currentUser]);

  return { createOrUpdate, getById, deleteById, getAllByPatient, getLatestPerPatient, countSince };
}
