import React,{useEffect,useState} from "react";
import {api} from "./api.js";
import StatusBadge from "./StatusBadge.jsx";
import "./cn1_cn4.css";

export default function RegistrationApprovalPage(){
 const [rows,setRows]=useState([]);const [msg,setMsg]=useState("");
 const load=async()=>setRows((await api.get("/registrations")).data);useEffect(()=>{load()},[]);
 const review=async(row,status)=>{const note=status==="REJECTED"?(prompt("Lý do từ chối:")||""):"";try{await api.patch(`/registrations/${row._id}/review`,{status,note,reviewedBy:"GV001"});setMsg(status==="APPROVED"?"Đã duyệt đăng ký.":"Đã từ chối đăng ký.");load()}catch(err){setMsg(err.response?.data?.message||err.message)}};
 return <><header className="page-header"><div><p className="eyebrow">CHỨC NĂNG 01</p><h1>Duyệt đăng ký đề tài</h1><p>Giáo viên xem yêu cầu, duyệt hoặc từ chối đăng ký.</p></div><div className="role-pill">Giáo viên · GV001</div></header>{msg&&<div className="notice">{msg}</div>}<section className="card"><div className="table-wrap"><table><thead><tr><th>Học sinh</th><th>Đề tài</th><th>Ngày gửi</th><th>Trạng thái</th><th>Phản hồi</th><th>Thao tác</th></tr></thead><tbody>{rows.map(r=><tr key={r._id}><td><b>{r.studentId}</b></td><td>{r.topicId?.title||"-"}</td><td>{new Date(r.createdAt).toLocaleString("vi-VN")}</td><td><StatusBadge value={r.status}/></td><td>{r.note||"-"}</td><td><div className="row-actions"><button className="success" disabled={r.status==="APPROVED"} onClick={()=>review(r,"APPROVED")}>Duyệt</button><button className="danger" disabled={r.status==="REJECTED"} onClick={()=>review(r,"REJECTED")}>Từ chối</button></div></td></tr>)}</tbody></table></div></section></>;
}
