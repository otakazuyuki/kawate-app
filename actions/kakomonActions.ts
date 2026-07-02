'use server';

import { getDriveClient } from '../lib/googleDrive';
import { createClient } from '@supabase/supabase-js';
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
 */
export async function uploadKakomonFile(
  formData: FormData, 
  subjectId: string, 
  metadata: { professor: string, year: number, semester: string },
  supabaseToken?: string
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

    // トークンを使ってログインユーザーを特定する
    let userId = null;
    if (supabaseToken) {
      const { data: { user } } = await supabase.auth.getUser(supabaseToken);
      userId = user?.id;
    }

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
        created_by: userId,
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
 * 3. 過去問ファイルの中身を取得する処理
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

/**
 * 💡 4. 【新規追加】過去問ファイルを削除する処理
 */
export async function deleteKakomonFile(fileId: string, driveFileId: string, supabaseToken: string) {
  try {
    // ユーザーのトークンを持った安全な一時的クライアントを生成（RLSを通過させるため）
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${supabaseToken}` } },
    });

    // 1. 先にSupabase側からデータを削除。RLSにより他人のデータなら0件削除(データが空)になる
    const { data, error } = await userSupabase
      .from('kakomon_files')
      .delete()
      .eq('id', fileId)
      .select();

    if (error) {
      throw new Error(`データベースの削除に失敗しました: ${error.message}`);
    }

    // 2. 本人ではないためRLSに弾かれた場合、dataは空になる
    if (!data || data.length === 0) {
      return { success: false, error: 'この過去問ファイルを削除する権限がありません。（自分が投稿したもののみ削除可能です）' };
    }

    // 3. Supabaseの削除が成功（＝本人確認完了）した場合のみ、Google Driveから削除する
    try {
      const drive = getDriveClient();
      await drive.files.delete({
        fileId: driveFileId,
      });
    } catch (driveError: any) {
      console.error('Googleドライブのファイル削除に失敗しました:', driveError);
      return { 
        success: true, 
        warning: 'データベースからは消去されましたが、Googleドライブ側の削除に失敗しました。' 
      };
    }

    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message || '過去問の削除に失敗しました' };
  }
}