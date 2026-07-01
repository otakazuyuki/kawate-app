'use server';

import { getDriveClient } from '../lib/googleDrive';
import { createClient } from '@supabase/supabase-js'; // 👈 確実な元のパッケージ
import { Readable } from 'stream';

// Supabaseの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CreateSubjectInput {
  category: '全学' | '専門';
  faculty?: string;
  department?: string;
  name: string;
}

/**
 * 1. 新しい科目（授業）を追加する処理
 */
export async function createKakomonSubject(input: CreateSubjectInput) {
  try {
    const drive = getDriveClient();

    // Google Drive上に自動で「科目名」のフォルダを作成
    const driveFolder = await drive.files.create({
      requestBody: {
        name: input.name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [process.env.GOOGLE_DRIVE_KAKOMON_ROOT_ID!],
      },
      fields: 'id',
    });

    const driveFolderId = driveFolder.data.id;
    if (!driveFolderId) throw new Error('Driveフォルダの作成に失敗しました');

    // Supabaseの「kakomon_subjects」テーブルに保存
    const { data, error } = await supabase
      .from('kakomon_subjects')
      .insert({
        category: input.category,
        faculty: input.faculty || null,
        department: input.department || null,
        name: input.name,
        drive_folder_id: driveFolderId,
        is_default: false,
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(error);
    return { success: false, error: '科目の追加に失敗しました' };
  }
}

/**
 * 2. 過去問ファイルをアップロードする処理
 * (画面側から「supabaseToken」を直接もらうようにして、確実にユーザーを判別します)
 */
export async function uploadKakomonFile(
  formData: FormData, 
  subjectId: string, 
  metadata: { professor: string, year: number, semester: string },
  supabaseToken?: string // 👈 画面から直接トークンを受け取る
) {
  try {
    const drive = getDriveClient();
    const file = formData.get('file') as File;
    if (!file) throw new Error('ファイルが見つかりません');

    // 保存先となる科目のフォルダIDをSupabaseから取得
    const { data: subject } = await supabase
      .from('kakomon_subjects')
      .select('drive_folder_id')
      .eq('id', subjectId)
      .single();

    if (!subject?.drive_folder_id) throw new Error('科目のフォルダが見つかりません');

    // Google Driveへファイルをアップロードする準備
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mediaStream = new Readable();
    mediaStream.push(buffer);
    mediaStream.push(null);

    // Google Driveへファイルをアップロード
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [subject.drive_folder_id], 
      },
      media: {
        mimeType: file.type,
        body: mediaStream,
      },
      supportsAllDrives: true, 
      fields: 'id',
    });

    const driveFileId = driveResponse.data.id;
    if (!driveFileId) throw new Error('Driveへのアップロードに失敗しました');

    // ⭕ 届いたトークンを使ってログインユーザーを特定する
    let userId = null;
    if (supabaseToken) {
      const { data: { user } } = await supabase.auth.getUser(supabaseToken);
      userId = user?.id;
    }

    // トークンが無効、またはログインしていなければここで安全にブロック
    if (!userId) throw new Error('ログインしていません');

    // Supabaseの「kakomon_files」に保存
    const { data: fileRecord, error: fileError } = await supabase
      .from('kakomon_files')
      .insert({
        subject_id: subjectId,
        name: file.name,
        drive_file_id: driveFileId,
        professor: metadata.professor,
        year: metadata.year,
        semester: metadata.semester,
        created_by: userId, // 本物のユーザーIDを保存
      })
      .select()
      .single();

    if (fileError) throw fileError;
    return { success: true, data: fileRecord };
  } catch (error) {
    console.error(error);
    return { success: false, error: '過去問のアップロードに失敗しました' };
  }
}

/**
 * 3. 過去問ファイルの中身を取得する処理（アプリ内プレビュー用）
 */
export async function getKakomonFileStream(driveFileId: string) {
  try {
    const drive = getDriveClient();

    const response = await drive.files.get(
      { fileId: driveFileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );

    const buffer = Buffer.from(response.data as ArrayBuffer);
    const base64Data = buffer.toString('base64');
    
    const meta = await drive.files.get({ fileId: driveFileId, fields: 'mimeType' });

    return { 
      success: true, 
      base64: `data:${meta.data.mimeType};base64,${base64Data}`,
      mimeType: meta.data.mimeType 
    };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'ファイルの読み込みに失敗しました' };
  }
}