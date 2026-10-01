import apiService from './apiService';

const managementService = {
  // ===== MÔN HỌC =====
  async getMonHocByGV(gvId) {
    const res = await apiService.get(`/monhoc/giaovien/${gvId}`);
    return res.data;
  },

  async createMonHoc(data) {
    const res = await apiService.post('/monhoc', data);
    return res.data;
  },

  async updateMonHoc(id, data) {
    const res = await apiService.put(`/monhoc/${id}`, data);
    return res.data;
  },

  async deleteMonHoc(id) {
    const res = await apiService.delete(`/monhoc/${id}`);
    return res.data;
  },

  // ===== LỚP HỌC =====
  async getLopHocByGV(gvId) {
    const res = await apiService.get(`/lophoc/giaovien/${gvId}`);
    return res.data;
  },

  async getLopHocDetail(id) {
    const res = await apiService.get(`/lophoc/${id}/detail`);
    return res.data;
  },

  async createLopHoc(data) {
    const res = await apiService.post('/lophoc', data);
    return res.data;
  },

  async updateLopHoc(id, data) {
    const res = await apiService.put(`/lophoc/${id}`, data);
    return res.data;
  },

  async addHocSinhToLop(lopId, data) {
    const res = await apiService.post(`/lophoc/${lopId}/hocsinh`, typeof data === 'object' ? data : { hocSinhId: data });
    return res.data;
  },

  async removeHocSinhFromLop(lopId, hsId) {
    const res = await apiService.delete(`/lophoc/${lopId}/hocsinh/${hsId}`);
    return res.data;
  },

  async deleteLopHoc(id) {
    const res = await apiService.delete(`/lophoc/${id}`);
    return res.data;
  },

  async getLopHocByHocSinh(hsId) {
    const res = await apiService.get(`/lophoc/hocsinh/${hsId}`);
    return res.data;
  },

  async importHocSinhToLop(lopId, danhSachMaHS) {
    const res = await apiService.post(`/lophoc/${lopId}/import-hocsinh`, { danhSachMaHS });
    return res.data;
  },

  // ===== HỌC SINH =====
  async getAllHocSinh() {
    const res = await apiService.get('/hocsinh');
    return res.data;
  },

  async getHocSinhByGV(gvId) {
    const res = await apiService.get(`/lophoc/giaovien/${gvId}/hocsinh`);
    return res.data;
  },

  // ===== LỜI MỜI LỚP HỌC =====
  async inviteHocSinhToLop(lopId, hocSinhId) {
    const res = await apiService.post(`/loimoi-lophoc/${lopId}/invite`, { hocSinhId });
    return res.data;
  },

  async inviteBatchToLop(lopId, danhSachMaHS) {
    const res = await apiService.post(`/loimoi-lophoc/${lopId}/invite-batch`, { danhSachMaHS });
    return res.data;
  },

  async getInvitesByLopHoc(lopId) {
    const res = await apiService.get(`/loimoi-lophoc/lophoc/${lopId}`);
    return res.data;
  },

  async getMyClassInvites(hsId) {
    const res = await apiService.get(`/loimoi-lophoc/hocsinh/${hsId}`);
    return res.data;
  },

  async respondClassInvite(inviteId, accept) {
    const res = await apiService.post(`/loimoi-lophoc/${inviteId}/respond`, { accept });
    return res.data;
  },

  async cancelClassInvite(inviteId) {
    const res = await apiService.delete(`/loimoi-lophoc/${inviteId}`);
    return res.data;
  },
};

export default managementService;

