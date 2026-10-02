import React,{useEffect,useState} from "react";
import {api} from "./api.js";
import StatusBadge from "./StatusBadge.jsx";
import "./cn1_cn4.css";

export default function StudentTopicsPage(){
 const [studentId,setStudentId]=useState("HS001");const [topics,setTopics]=useState([]);const [regs,setRegs]=useState([]);const [msg,setMsg]=useState("");
 const load=async(id=studentId)=>{const [t,r]=await Promise.all([api.get("/topics?status=PUBLISHED"),api.get(`/registrations?studentId=${encodeURIComponent(id)}`)]);setTopics(t.data);setRegs(r.data)};useEffect(()=>{load()},[]);
 const register=async id=>{try{await api.post("/registrations",{topicId:id,studentId});setMsg("Đã gửi yêu cầu đăng ký. Trạng thái hiện tại: Chờ duyệt.");load()}catch(err){setMsg(err.response?.data?.message||err.message)}};
 return <><header className="page-header"><div><p className="eyebrow">CHỨC NĂNG 01</p><h1>Học sinh xem & đăng ký đề tài</h1><p>Chỉ hiển thị đề tài đang công bố và còn trong quy trình đăng ký.</p></div><div className="student-box"><label>Mã học sinh<input value={studentId} onChange={e=>setStudentId(e.target.value)}/></label><button onClick={()=>load(studentId)}>Tải dữ liệu</button></div></header>{msg&&<div className="notice">{msg}</div>}<div className="topic-grid">{topics.map(t=><article className="topic-card" key={t._id}><div className="topic-top"><StatusBadge value={t.status}/><span>Hạn {new Date(t.registrationDeadline).toLocaleDateString("vi-VN")}</span></div><h3>{t.title}</h3><p>{t.description}</p><div className="soft-box"><b>Yêu cầu</b><br/>{t.requirements||"Chưa cập nhật"}</div><div className="topic-footer"><span>Tối đa {t.maxStudents} học sinh</span><button className="primary" onClick={()=>register(t._id)}>Đăng ký</button></div></article>)}</div><section className="card"><h2>Trạng thái đăng ký</h2><div className="table-wrap"><table><thead><tr><th>Đề tài</th><th>Ngày gửi</th><th>Trạng thái</th><th>Phản hồi GV</th></tr></thead><tbody>{regs.map(r=><tr key={r._id}><td>{r.topicId?.title||"-"}</td><td>{new Date(r.createdAt).toLocaleString("vi-VN")}</td><td><StatusBadge value={r.status}/></td><td>{r.note||"-"}</td></tr>)}</tbody></table></div></section></>;
}
