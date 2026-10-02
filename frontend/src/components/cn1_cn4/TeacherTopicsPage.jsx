import React, { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import StatusBadge from "./StatusBadge.jsx";
import StatCard from "./StatCard.jsx";
import "./cn1_cn4.css";

const empty = { title:"", description:"", requirements:"", maxStudents:1, registrationDeadline:"", status:"DRAFT", teacherId:"GV001" };

export default function TeacherTopicsPage(){
  const [topics,setTopics]=useState([]); const [form,setForm]=useState(empty); const [editId,setEditId]=useState(null); const [msg,setMsg]=useState("");
  const load=async()=>setTopics((await api.get("/topics?teacherId=GV001")).data);
  useEffect(()=>{load()},[]);
  const stats=useMemo(()=>({all:topics.length,pub:topics.filter(x=>x.status==="PUBLISHED").length,closed:topics.filter(x=>x.status==="CLOSED").length}),[topics]);
  const submit=async(e)=>{e.preventDefault();setMsg("");try{ editId?await api.put(`/topics/${editId}`,form):await api.post("/topics",form); setForm(empty);setEditId(null);setMsg(editId?"Đã cập nhật đề tài.":"Đã tạo đề tài.");await load();}catch(err){setMsg(err.response?.data?.message||err.message)}};
  const edit=t=>{setEditId(t._id);setForm({...t,registrationDeadline:t.registrationDeadline?.slice(0,10)});window.scrollTo({top:0,behavior:"smooth"})};
  const status=async(t,s)=>{await api.patch(`/topics/${t._id}/status`,{status:s});load()};
  const remove=async t=>{if(!confirm(`Xóa đề tài “${t.title}”?`))return;try{await api.delete(`/topics/${t._id}`);load()}catch(err){setMsg(err.response?.data?.message||err.message)}};
  return <>
    <header className="page-header"><div><p className="eyebrow">CHỨC NĂNG 01</p><h1>Quản lý đề tài</h1><p>Giáo viên tạo, cập nhật, công bố, đóng và quản lý đề tài.</p></div><div className="role-pill">Giáo viên · GV001</div></header>
    <div className="stats"><StatCard label="Tổng đề tài" value={stats.all}/><StatCard label="Đang công bố" value={stats.pub}/><StatCard label="Đã đóng" value={stats.closed}/></div>
    <section className="card"><div className="card-head"><div><h2>{editId?"Cập nhật đề tài":"Tạo đề tài mới"}</h2><p>Thông tin bám theo Use Case quản lý đề tài.</p></div></div>
      <form className="grid-form" onSubmit={submit}>
        <label className="wide">Tên đề tài<input required minLength="3" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
        <label className="wide">Mô tả<textarea required value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label>
        <label className="wide">Yêu cầu / kỹ năng<textarea value={form.requirements} onChange={e=>setForm({...form,requirements:e.target.value})}/></label>
        <label>Số lượng học sinh tối đa<input type="number" min="1" max="20" value={form.maxStudents} onChange={e=>setForm({...form,maxStudents:Number(e.target.value)})}/></label>
        <label>Hạn đăng ký<input type="date" required value={form.registrationDeadline} onChange={e=>setForm({...form,registrationDeadline:e.target.value})}/></label>
        <label>Trạng thái<select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="DRAFT">Nháp</option><option value="PUBLISHED">Công bố</option><option value="CLOSED">Đóng</option></select></label>
        <div className="wide form-actions"><button className="primary">{editId?"Lưu thay đổi":"Tạo đề tài"}</button>{editId&&<button type="button" onClick={()=>{setEditId(null);setForm(empty)}}>Hủy chỉnh sửa</button>}</div>
      </form>{msg&&<div className="notice">{msg}</div>}
    </section>
    <section className="card"><div className="card-head"><div><h2>Danh sách đề tài</h2><p>{topics.length} bản ghi thuộc giáo viên hiện tại.</p></div></div><div className="table-wrap"><table><thead><tr><th>Đề tài</th><th>SL</th><th>Hạn đăng ký</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{topics.map(t=><tr key={t._id}><td><b>{t.title}</b><small>{t.requirements||"Chưa có yêu cầu"}</small></td><td>{t.maxStudents}</td><td>{new Date(t.registrationDeadline).toLocaleDateString("vi-VN")}</td><td><StatusBadge value={t.status}/></td><td><div className="row-actions"><button onClick={()=>edit(t)}>Sửa</button>{t.status!=="PUBLISHED"&&<button onClick={()=>status(t,"PUBLISHED")}>Công bố</button>}{t.status!=="CLOSED"&&<button onClick={()=>status(t,"CLOSED")}>Đóng</button>}<button className="danger" onClick={()=>remove(t)}>Xóa</button></div></td></tr>)}</tbody></table></div></section>
  </>;
}
