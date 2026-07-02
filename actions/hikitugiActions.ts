'use server';

import { createClient } from '@supabase/supabase-js';
import { getDriveClient } from '@/lib/googleDrive';
import { Readable } from 'stream';
import {google} from 'googleapis';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function getGoogleDriveClient(){
    const oauth2Client=new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
        refresh_token:process.env.GOOGLE_REFRESH_TOKEN
    });
    return google.drive({version:'v3',auth:oauth2Client}
    )
}

/**
 * 1. 指定した期のメインジャンル一覧を取得
 */
export async function getMainGenres(ki: number) {
  try {
    const { data, error } = await supabase
      .from('hikitugi_main_genres')
      .select('*')
      .eq('ki', ki)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('getMainGenres Error:', error);
    return { success: false, error: 'メインジャンルの取得に失敗しました' };
  }
}

/**
 * 2. 指定した期のサブジャンル一覧を取得 (メインジャンルの情報と、今期のファイル存在確認も結合)
 * 💡「未引き継ぎアラート」のために、hikitugi_files の存在チェックを左結合しています。
 */
export async function getSubGenres(ki: number) {
  try {
    const { data, error } = await supabase
      .from('hikitugi_sub_genres')
      .select(`
        *,
        hikitugi_main_genres(name),
        hikitugi_files(id, ki)
      `)
      .eq('ki', ki)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 💡 取得したデータに対して、「今期(ki)のファイルが1つでもあるか」の判定フラグを付与する
    const formattedData = data?.map(sub => {
      // 紐づくファイルの中から、現在の期(ki)と一致するものを探す
      const hasFileThisKi = sub.hikitugi_files?.some((f: any) => f.ki === ki);
      return {
        ...sub,
        is_completed: hasFileThisKi // trueなら引き継ぎ完了、falseなら未引き継ぎ
      };
    });

    return { success: true, data: formattedData };
  } catch (error) {
    console.error('getSubGenres Error:', error);
    return { success: false, error: 'サブジャンルの取得に失敗しました' };
  }
}

/**
 * 3. メインジャンルを追加
 */
export async function createMainGenre(ki: number, name: string) {
  try {
    if (!name.trim()) throw new Error('ジャンル名が空です');

    const { data, error } = await supabase
      .from('hikitugi_main_genres')
      .insert({ ki, name: name.trim() })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('createMainGenre Error:', error);
    return { success: false, error: 'メインジャンルの追加に失敗しました' };
  }
}

/**
 * 4. サブジャンルを追加
 */
export async function createSubGenre(ki: number, mainGenreId: string, name: string) {
  try {
    if (!mainGenreId) throw new Error('メインジャンルIDが必要です');
    if (!name.trim()) throw new Error('サブジャンル名が空です');

    const { data, error } = await supabase
      .from('hikitugi_sub_genres')
      .insert({ 
        ki,
        main_genre_id: mainGenreId, 
        name: name.trim() 
      })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('createSubGenre Error:', error);
    return { success: false, error: 'サブジャンルの追加に失敗しました' };
  }
}

/**
 * 5. メインジャンルを削除
 */
export async function deleteMainGenre(id: string) {
  try {
    const { error } = await supabase
      .from('hikitugi_main_genres')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('deleteMainGenre Error:', error);
    return { success: false, error: 'メインジャンルの削除に失敗しました' };
  }
}

/**
 * 6. サブジャンルを削除
 */
export async function deleteSubGenre(id: string) {
  try {
    const { error } = await supabase
      .from('hikitugi_sub_genres')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('deleteSubGenre Error:', error);
    return { success: false, error: 'サブジャンルの削除に失敗しました' };
  }
}

/**
 * 7. 代替わり時のジャンル自動コピー処理
 */
export async function setupNextKiGenres(newKi: number) {
  try {
    const { count, error: checkError } = await supabase
      .from('hikitugi_main_genres')
      .select('*', { count: 'exact', head: true })
      .eq('ki', newKi);

    if (checkError) throw checkError;
    if (count && count > 0) {
      return { success: true, message: `既に ${newKi} 期のジャンルは初期化されています。` };
    }

    const prevKi = newKi - 1;

    const { data: prevMainGenres, error: mainError } = await supabase
      .from('hikitugi_main_genres')
      .select('*')
      .eq('ki', prevKi);

    if (mainError) throw mainError;
    if (!prevMainGenres || prevMainGenres.length === 0) {
      return { success: true, message: `前の期 (${prevKi}期) のデータがないため、コピーをスキップしました。` };
    }

    for (const mainGenre of prevMainGenres) {
      const { data: newMain, error: insertMainError } = await supabase
        .from('hikitugi_main_genres')
        .insert({ ki: newKi, name: mainGenre.name })
        .select()
        .single();

      if (insertMainError) throw insertMainError;

      const { data: prevSubGenres, error: subError } = await supabase
        .from('hikitugi_sub_genres')
        .select('*')
        .eq('main_genre_id', mainGenre.id);

      if (subError) throw subError;

      if (prevSubGenres && prevSubGenres.length > 0) {
        const subInserts = prevSubGenres.map(sub => ({
          ki: newKi,
          main_genre_id: newMain.id,
          name: sub.name
        }));

        const { error: insertSubError } = await supabase
          .from('hikitugi_sub_genres')
          .insert(subInserts);

        if (insertSubError) throw insertSubError;
      }
    }

    return { success: true, message: `${newKi} 期のジャンル初期化が完了しました。` };
  } catch (error) {
    console.error('setupNextKiGenres Error:', error);
    return { success: false, error: '代替わりジャンルコピーに失敗しました' };
  }
}

/**
 * 🔥 8. 引き継ぎファイルを Google Drive ＆ Supabase にアップロードする処理
 */
export async function uploadHikitugiFile(
  formData: FormData,
  metadata: {
    title: string;
    ki: number;
    role: string;
    mainGenreId: string;
    subGenreId: string;
    isRoleRestricted: boolean;
    memo: string;
  },
  supabaseToken: string
) {
  try {
    const file = formData.get('file') as File;
    if (!file) throw new Error('ファイルが見つかりません');

    // ⭕ 1. トークンからログインユーザーの特定
    const { data: { user } } = await supabase.auth.getUser(supabaseToken);
    const userId = user?.id;
    if (!userId) throw new Error('ログインセッションが無効です。再度ログインしてください。');

    // ⭕ 2. Google Drive クライアントの準備
    const drive = getDriveClient();

    // ⭕ 3. ファイルバイナリをストリームに変換
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mediaStream = new Readable();
    mediaStream.push(buffer);
    mediaStream.push(null);

    // ⭕ 4. Google Driveへフラットに保存
    const driveResponse = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [process.env.GOOGLE_DRIVE_HIKITUGI_ROOT_ID!], // 引き継ぎ用のルートフォルダID
      },
      media: {
        mimeType: file.type,
        body: mediaStream,
      },
      supportsAllDrives: true,
      fields: 'id',
    });

    const googleDriveFileId = driveResponse.data.id;
    if (!googleDriveFileId) throw new Error('Google Driveへのアップロードに失敗しました');

    // ⭕ 5. Supabaseの「hikitugi_files」テーブルにメタデータを格納
    const { data: fileRecord, error: dbError } = await supabase
      .from('hikitugi_files')
      .insert({
        title: metadata.title.trim(),
        google_drive_file_id: googleDriveFileId,
        ki: metadata.ki,
        role: metadata.role,
        main_genre_id: metadata.mainGenreId || null,
        sub_genre_id: metadata.subGenreId || null,
        is_role_restricted: metadata.isRoleRestricted,
        memo: metadata.memo.trim() || null,
        created_by: userId
      })
      .select()
      .single();

    if (dbError) throw dbError;
    return { success: true, data: fileRecord };

  } catch (error: any) {
    console.error('uploadHikitugiFile Error:', error);
    return { success: false, error: error.message || '資料のアップロードに失敗しました' };
  }
}

/**
 * 🔥 9. 引き継ぎ資料の検索処理 (同役職閲覧制限のロジック付き)
 */
export async function searchHikitugiFiles(filters: {
  ki?: number;
  role?: string;
  mainGenreId?: string;
  subGenreId?: string;
  currentUserRole: string; // 💡 ログインしているユーザー本人の役職
}) {
  try {
    let query = supabase
      .from('hikitugi_files')
      .select('*, hikitugi_main_genres(name), hikitugi_sub_genres(name)');

    // 各プルダウンの絞り込み
    if (filters.ki) query = query.eq('ki', filters.ki);
    if (filters.role) query = query.eq('role', filters.role);
    if (filters.mainGenreId) query = query.eq('main_genre_id', filters.mainGenreId);
    if (filters.subGenreId) query = query.eq('sub_genre_id', filters.subGenreId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // 💡 制限判定ロジック:
    // 「制限なし(false)」または「資料の役職が自分の現在の役職と一致している」データだけをフィルタリング
    const filteredData = data?.filter(file => {
      if (!file.is_role_restricted) return true; // 全員公開はスルー
      return file.role === filters.currentUserRole; // 制限ありなら、役職一致のみOK
    });

    return { success: true, data: filteredData };
  } catch (error) {
    console.error('searchHikitugiFiles Error:', error);
    return { success: false, error: '資料の検索に失敗しました' };
  }
}

// 💡 削除用のアクション
export async function deleteHikitugiFile(fileId: string, googleDriveFileId: string, userToken: string) {
  try {
    // ユーザーのトークンを使ってSupabaseクライアントを初期化（RLSを効かせるため）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: { headers: { Authorization: `Bearer ${userToken}` } },
      }
    );

    // 1. まずSupabaseからデータを削除してみる（RLSにより、他人のデータならここで失敗するか0件削除になる）
    const { data, error, count } = await supabase
      .from("hikitugi_files")
      .delete()
      .eq("id", fileId)
      .select(); // 削除できたデータを取得

    if (error) {
      return { success: false, error: `データベースの削除に失敗しました: ${error.message}` };
    }

    // 2. RLSによって削除が拒絶された（自分が作ったファイルではない）場合、selectの結果が空になる
    if (!data || data.length === 0) {
      return { success: false, error: "このファイルを削除する権限がありません。（自分が投稿したファイルのみ削除できます）" };
    }

    // 3. Supabaseの削除が成功した場合のみ、Googleドライブのファイルも削除する
    try{
        const drive=getGoogleDriveClient();
        await drive.files.delete({
            fileId:googleDriveFileId,
        });
    }catch(driveError:any){
        console.error("Googleドライブのファイル削除に失敗しました:",driveError);
        return{
            success:true,
            warning:"データベースからは削除されましたが、Googleドライブの削除に失敗しました。管理者に連絡してください。"
        }
    }

    return { success: true };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: "予期せぬエラーが発生しました。" };
  }
}