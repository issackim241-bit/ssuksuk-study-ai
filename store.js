import {mkdirSync} from 'node:fs';
import path from 'node:path';
export async function openStore() {
  let query,close,kind;
  if(process.env.DATABASE_URL){
    const {Pool}=await import('pg');
    const pool=new Pool({connectionString:process.env.DATABASE_URL,max:5,connectionTimeoutMillis:10000,
      ...(process.env.DATABASE_SSL==='true'?{ssl:{rejectUnauthorized:true}}:{})});
    query=async(sql,args=[]) => (await pool.query(sql,args));
    close=()=>pool.end();kind='postgres';
  }else if(process.env.NODE_ENV==='production'||process.env.RENDER){
    return null;
  }else{
    const {DatabaseSync}=await import('node:sqlite');
    const file=process.env.SQLITE_PATH||'data/study.sqlite';mkdirSync(path.dirname(file),{recursive:true});
    const db=new DatabaseSync(file);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
    query=async(sql,args=[])=>{
      const values=[];
      const converted=sql.replace(/\$(\d+)/g,(_,n)=>{values.push(args[Number(n)-1]);return '?';});
      const stmt=db.prepare(converted);
      if(/^\s*(SELECT|INSERT.*RETURNING|UPDATE.*RETURNING|DELETE.*RETURNING)/is.test(sql))return {rows:stmt.all(...values)};
      const result=stmt.run(...values);return {rows:[],rowCount:Number(result.changes)};
    };close=()=>db.close();kind='sqlite';
  }
  await query(`CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, salt TEXT NOT NULL, state TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0)`);
  await query(`CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, csrf TEXT NOT NULL, expires BIGINT NOT NULL)`);
  return {query,close,kind};
}
