# -*- coding: utf-8 -*-
import os
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def add_hyperlink(paragraph, url, text, color="004B91", underline=True):
    part = paragraph.part
    r_id = part.relate_to(url, docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK, is_external=True)
    hyperlink = parse_xml(f'<w:hyperlink {nsdecls("w")} r:id="{r_id}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>')
    new_run = parse_xml(f'''
        <w:r {nsdecls("w")}>
            <w:rPr>
                <w:color w:val="{color}"/>
                {"<w:u w:val='single'/>" if underline else ""}
                <w:b/>
            </w:rPr>
            <w:t>{text}</w:t>
        </w:r>
    ''')
    hyperlink.append(new_run)
    paragraph._p.append(hyperlink)

def create_bom_document(output_path):
    doc = Document()
    
    # Page setup (A4, 2cm margins)
    for section in doc.sections:
        section.top_margin = Inches(0.75)
        section.bottom_margin = Inches(0.75)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)

    # 1. Title Header
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = title_p.add_run("DANH MỤC LINH KIỆN & BÁO GIÁ THỰC HIỆN HÓA PHẦN CỨNG\n")
    r_title.bold = True
    r_title.font.size = Pt(16)
    r_title.font.color.rgb = RGBColor(18, 90, 58) # Deep Forest Green

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = sub_p.add_run("ĐỀ TÀI: HỆ THỐNG TƯỚI CÂY THÔNG MINH IOT (ESP32 + AZURE CLOUD + WEB DASHBOARD)\n")
    r_sub.bold = True
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(40, 116, 80)

    info_p = doc.add_paragraph()
    info_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_info = info_p.add_run("Nguồn cung ứng tham khảo: Thế Giới IC (thegioiic.com) • Tối ưu kinh phí sinh viên\n")
    r_info.italic = True
    r_info.font.size = Pt(10)
    r_info.font.color.rgb = RGBColor(100, 110, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(6)

    # 2. Executive Summary Box
    summary_table = doc.add_table(rows=1, cols=1)
    summary_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = summary_table.cell(0, 0)
    set_cell_background(cell, "F0FDF4") # soft green bg
    set_cell_margins(cell, 150, 150, 200, 200)
    
    sp = cell.paragraphs[0]
    sr1 = sp.add_run("🎯 Mục tiêu thực hiện hóa:\n")
    sr1.bold = True
    sr1.font.size = Pt(11)
    sr1.font.color.rgb = RGBColor(22, 101, 52)
    
    sr2 = sp.add_run(
        "• Chuyển đổi từ mô phỏng Wokwi sang mô hình mạch thật hoạt động 100% ngoài thực tế.\n"
        "• Kết nối cảm biến đo độ ẩm đất, nước mưa, nhiệt độ/độ ẩm không khí, màn hình LCD và máy bơm tưới cây.\n"
        "• Tối ưu kinh phí: Toàn bộ linh kiện chọn mua tại cùng 1 nhà cung cấp (Thế Giới IC - Thủ Đức, TP.HCM) để gom 1 đơn ship duy nhất (~25k-30k).\n"
        "• Tổng ngân sách dự kiến: Chỉ từ ~420.000 VNĐ đến ~480.000 VNĐ cho trọn bộ mạch hoàn chỉnh."
    )
    sr2.font.size = Pt(10)
    sr2.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 3. Main BOM Table
    h2 = doc.add_paragraph()
    r_h2 = h2.add_run("I. BẢNG BÁO GIÁ CHI TIẾT LINH KIỆN TẠI THẾ GIỚI IC")
    r_h2.bold = True
    r_h2.font.size = Pt(12)
    r_h2.font.color.rgb = RGBColor(18, 90, 58)

    items = [
        # Nhóm 1: Điều khiển & Cảm biến
        {"cat": "Khối Điều Khiển & Cảm Biến", "stt": "1", "name": "Kit ESP32 NodeMCU LuaNode32 (30 Chân, CP2102)", "spec": "Chip ESP-WROOM-32, 2.4GHz Wi-Fi + BLE, nạp code Type-C/MicroUSB", "qty": 1, "price": 140000, "url": "https://www.thegioiic.com/kit-phat-trien-wifi-ble-esp32-nodemcu-luanode32-30-chan-cp2102"},
        {"cat": "", "stt": "2", "name": "Cảm biến độ ẩm đất điện dung (Capacitive v1.2)", "spec": "Chống ăn mòn điện cực, ngõ ra Analog 0-3.0V (an toàn GPIO34 ESP32)", "qty": 1, "price": 25000, "url": "https://www.thegioiic.com/cam-bien-do-am-dat-dien-dung"},
        {"cat": "", "stt": "3", "name": "Module cảm biến mưa rơi (Tấm cảm ứng + LM393)", "spec": "Gồm tấm điện cực phát hiện giọt mưa và mạch so sánh AO/DO", "qty": 1, "price": 22000, "url": "https://www.thegioiic.com/mach-cam-bien-mua-roi"},
        {"cat": "", "stt": "4", "name": "Cảm biến nhiệt độ & độ ẩm DHT22 / AM2302", "spec": "Độ chính xác cao (-40 đến 80°C, 0-100% RH), chuẩn 1-Wire số GPIO19", "qty": 1, "price": 75000, "url": "https://www.thegioiic.com/dht22-module"},
        {"cat": "", "stt": "5", "name": "Màn hình LCD 1602 kèm mạch I2C PCF8574 hàn sẵn", "spec": "Hiển thị 2 dòng 16 ký tự, giao tiếp 2 dây SDA (21), SCL (22)", "qty": 1, "price": 48000, "url": "https://www.thegioiic.com/lcd-1602-nen-xanh-la-chu-den-5v-kem-i2c-driver"},
        
        # Nhóm 2: Chấp hành & Nguồn
        {"cat": "Khối Chấp Hành & Bơm Tưới", "stt": "6", "name": "Module 1 Relay 5V có Opto cách ly quang", "spec": "Kích High/Low tùy chọn, tiếp điểm 10A 250VAC / 30VDC, an toàn ESP32", "qty": 1, "price": 16000, "url": "https://www.thegioiic.com/module-1-relay-5v-kich-muc-cao-thap"},
        {"cat": "", "stt": "7", "name": "Máy bơm chìm mini 5VDC (1.2 - 1.6 Lít/phút)", "spec": "Điện áp 3.3V-5VDC, lưu lượng vừa đủ tưới chậu cây nhỏ, chạy êm", "qty": 1, "price": 35000, "url": "https://www.thegioiic.com/may-bom-chim-mini-5v-1-2-1-6l-phut"},
        {"cat": "", "stt": "8", "name": "Ống nước mềm silicon dẻo phi 6/8mm (2 mét)", "spec": "Vừa khít đầu ra của máy bơm chìm mini, không bị gập gãy", "qty": 2, "price": 10000, "url": "https://www.thegioiic.com/ong-silicon-phi-6-8mm"},
        {"cat": "", "stt": "9", "name": "Module nguồn hạ áp LM2596S 3A (Dự phòng nguồn 12V)", "spec": "Hạ áp từ 12V xuống 5V chuẩn ổn định cho ESP32 và Relay", "qty": 1, "price": 19000, "url": "https://www.thegioiic.com/lm2596s-mach-giam-ap-3a"},

        # Nhóm 3: Linh kiện bảo vệ & Testboard
        {"cat": "Linh Kiện Bảo Vệ & Phụ Kiện Đấu Nối", "stt": "10", "name": "Diode chỉnh lưu & dập xung 1N4007 (1A 1000V)", "spec": "Mắc song song ngược cực motor bơm để triệt tiêu tia lửa điện & xung ngược", "qty": 5, "price": 1000, "url": "https://www.thegioiic.com/diode-chinh-luu-1n4007-1a-1000v"},
        {"cat": "", "stt": "11", "name": "Gói điện trở cắm 1/4W (220Ω, 1kΩ, 4.7kΩ, 10kΩ)", "spec": "Trở hạn dòng LED, trở treo nút nhấn, trở phân áp bảo vệ analog", "qty": 1, "price": 10000, "url": "https://www.thegioiic.com/dien-tro-1-4w-5"},
        {"cat": "", "stt": "12", "name": "Đèn LED phi 5mm (Đỏ + Xanh lá)", "spec": "Báo trạng thái trời mưa (LED27) và đèn báo nguồn/bơm", "qty": 5, "price": 1000, "url": "https://www.thegioiic.com/led-5mm"},
        {"cat": "", "stt": "13", "name": "Nút nhấn 4 chân 12x12mm hoặc 6x6mm", "spec": "Làm nút nhấn Bơm tay (GPIO33) và nút Dừng khẩn cấp STOP", "qty": 3, "price": 2000, "url": "https://www.thegioiic.com/nut-nhan-4-chan-12x12"},
        {"cat": "", "stt": "14", "name": "Testboard MB-102 (Breadboard 830 lỗ)", "spec": "Cắm linh kiện thử nghiệm không cần hàn chì, tái sử dụng nhiều lần", "qty": 1, "price": 38000, "url": "https://www.thegioiic.com/test-board-mb-102-830-lo"},
        {"cat": "", "stt": "15", "name": "Bó dây cắm Dupont 20cm (Combo Đực-Đực, Đực-Cái)", "spec": "Chuẩn 20cm x 40 sợi, lõi đồng dẻo, cắm giữa ESP32, cảm biến và board", "qty": 2, "price": 18000, "url": "https://www.thegioiic.com/day-cam-test-board-duc-cai-20cm-tep-40-soi"}
    ]

    table = doc.add_table(rows=1, cols=7)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(0.4), Inches(2.2), Inches(1.8), Inches(0.4), Inches(0.8), Inches(0.9), Inches(1.0)]
    headers = ["STT", "Tên Linh Kiện", "Thông Số / Ứng Dụng", "SL", "Đơn Giá", "Thành Tiền", "Link Tham Khảo"]

    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "125A3A") # Dark Green
        set_cell_margins(hdr_cells[i], 120, 120, 80, 80)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(title)
        run.bold = True
        run.font.size = Pt(9.5)
        run.font.color.rgb = RGBColor(255, 255, 255)

    current_cat = None
    total_cost = 0

    for item in items:
        # Category separator row
        if item["cat"] and item["cat"] != current_cat:
            current_cat = item["cat"]
            cat_row = table.add_row()
            cat_cell = cat_row.cells[0]
            # merge across 7 cols
            for c_idx in range(1, 7):
                cat_cell.merge(cat_row.cells[c_idx])
            set_cell_background(cat_cell, "E2E8F0") # Slate grey
            set_cell_margins(cat_cell, 80, 80, 100, 100)
            cp = cat_cell.paragraphs[0]
            c_run = cp.add_run(f"📁 {current_cat.upper()}")
            c_run.bold = True
            c_run.font.size = Pt(9.5)
            c_run.font.color.rgb = RGBColor(30, 41, 59)

        row_cells = table.add_row().cells
        for idx in range(7):
            row_cells[idx].width = col_widths[idx]
            set_cell_margins(row_cells[idx], 80, 80, 60, 60)

        # STT
        p0 = row_cells[0].paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r0 = p0.add_run(item["stt"])
        r0.font.size = Pt(9)

        # Tên linh kiện
        p1 = row_cells[1].paragraphs[0]
        r1 = p1.add_run(item["name"])
        r1.bold = True
        r1.font.size = Pt(9)

        # Thông số
        p2 = row_cells[2].paragraphs[0]
        r2 = p2.add_run(item["spec"])
        r2.font.size = Pt(8.5)
        r2.font.color.rgb = RGBColor(71, 85, 105)

        # Số lượng
        p3 = row_cells[3].paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r3 = p3.add_run(str(item["qty"]))
        r3.font.size = Pt(9)

        # Đơn giá
        p4 = row_cells[4].paragraphs[0]
        p4.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r4 = p4.add_run(f"{item['price']:,}đ")
        r4.font.size = Pt(9)

        # Thành tiền
        subtotal = item["qty"] * item["price"]
        total_cost += subtotal
        p5 = row_cells[5].paragraphs[0]
        p5.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r5 = p5.add_run(f"{subtotal:,}đ")
        r5.bold = True
        r5.font.size = Pt(9)

        # Link
        p6 = row_cells[6].paragraphs[0]
        p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_hyperlink(p6, item["url"], "Xem Web ↗", color="0284C7", underline=True)

    # Total row
    tot_row = table.add_row()
    tot_cell = tot_row.cells[0]
    for c_idx in range(1, 5):
        tot_cell.merge(tot_row.cells[c_idx])
    set_cell_background(tot_cell, "F1F5F9")
    set_cell_margins(tot_cell, 100, 100, 100, 100)
    tp = tot_cell.paragraphs[0]
    tp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    tr = tp.add_run("TỔNG CỘNG TIỀN LINH KIỆN:")
    tr.bold = True
    tr.font.size = Pt(10)

    val_cell = tot_row.cells[5]
    set_cell_background(val_cell, "DCFCE7") # light emerald
    set_cell_margins(val_cell, 100, 100, 100, 100)
    vp = val_cell.paragraphs[0]
    vp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    vr = vp.add_run(f"{total_cost:,} VNĐ")
    vr.bold = True
    vr.font.size = Pt(10.5)
    vr.font.color.rgb = RGBColor(22, 101, 52)

    blank_cell = tot_row.cells[6]
    set_cell_background(blank_cell, "F1F5F9")

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # 4. Optimization Recommendations
    h3 = doc.add_paragraph()
    r_h3 = h3.add_run("II. CHIẾN LƯỢC TỐI ƯU KINH PHÍ SINH VIÊN (2 PHƯƠNG ÁN NGUỒN)")
    r_h3.bold = True
    r_h3.font.size = Pt(12)
    r_h3.font.color.rgb = RGBColor(18, 90, 58)

    opt_table = doc.add_table(rows=3, cols=2)
    opt_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    opt_table.autofit = False
    opt_table.rows[0].cells[0].width = Inches(3.4)
    opt_table.rows[0].cells[1].width = Inches(3.4)

    # Header
    set_cell_background(opt_table.rows[0].cells[0], "0284C7")
    set_cell_background(opt_table.rows[0].cells[1], "D97706")
    set_cell_margins(opt_table.rows[0].cells[0], 100, 100, 100, 100)
    set_cell_margins(opt_table.rows[0].cells[1], 100, 100, 100, 100)

    p_a = opt_table.rows[0].cells[0].paragraphs[0]
    p_a.alignment = WD_ALIGN_PARAGRAPH.CENTER
    ra = p_a.add_run("🌟 PHƯƠNG ÁN A: NGUỒN 5V USB (KHUYÊN DÙNG)")
    ra.bold = True; ra.font.size = Pt(10); ra.font.color.rgb = RGBColor(255,255,255)

    p_b = opt_table.rows[0].cells[1].paragraphs[0]
    p_b.alignment = WD_ALIGN_PARAGRAPH.CENTER
    rb = p_b.add_run("⚡ PHƯƠNG ÁN B: NGUỒN 12V ĐỘC LẬP (CÔNG SUẤT CAO)")
    rb.bold = True; rb.font.size = Pt(10); rb.font.color.rgb = RGBColor(255,255,255)

    # Content
    cell_a = opt_table.rows[1].cells[0]
    set_cell_background(cell_a, "F0F9FF")
    set_cell_margins(cell_a, 100, 100, 120, 120)
    ca_p = cell_a.paragraphs[0]
    ca_p.add_run(
        "• Thiết bị: Bơm chìm mini 5V (35.000đ).\n"
        "• Nguồn cấp: Tận dụng củ sạc điện thoại 5V 2A có sẵn tại nhà qua cáp USB.\n"
        "• Ưu điểm: KHÔNG CẦN mua Adapter 12V (tiết kiệm 85k), KHÔNG CẦN module hạ áp LM2596 (tiết kiệm 20k).\n"
        "• An toàn: Điện áp 5V an toàn tuyệt đối khi thử nghiệm với nước, không sợ chập cháy điện giật.\n"
        "• Tổng chi phí thực tế: Chỉ ~390.000 VNĐ."
    ).font.size = Pt(9.5)

    cell_b = opt_table.rows[1].cells[1]
    set_cell_background(cell_b, "FFFBEB")
    set_cell_margins(cell_b, 100, 100, 120, 120)
    cb_p = cell_b.paragraphs[0]
    cb_p.add_run(
        "• Thiết bị: Bơm màng áp lực 12V (động cơ 370 hoặc 180).\n"
        "• Nguồn cấp: Cần mua thêm Adapter 12V 2A/3A (~80k - 90k) + Mạch hạ áp LM2596 (19k) để hạ xuống 5V nuôi ESP32.\n"
        "• Ưu điểm: Bơm nước khỏe, đẩy cao được 1 - 2 mét, phù hợp béc phun sương ngoài vườn thật.\n"
        "• Nhược điểm: Chi phí tăng thêm ~100k - 120k. Cần chú ý tản nhiệt cho LM2596.\n"
        "• Tổng chi phí: Khoảng ~510.000 VNĐ."
    ).font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # 5. Pinout Mapping Table
    h4 = doc.add_paragraph()
    r_h4 = h4.add_run("III. SƠ ĐỒ ĐẤU NỐI CHÂN THỰC TẾ (PINOUT MAPPING CHUẨN 1:1)")
    r_h4.bold = True
    r_h4.font.size = Pt(12)
    r_h4.font.color.rgb = RGBColor(18, 90, 58)

    pin_table = doc.add_table(rows=7, cols=4)
    pin_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    pin_headers = ["Linh Kiện", "Chân Cảm Biến / Module", "Chân ESP32 (GPIO)", "Ghi Chú Kỹ Thuật"]
    
    for i, title in enumerate(pin_headers):
        pin_table.rows[0].cells[i].paragraphs[0].add_run(title).bold = True
        set_cell_background(pin_table.rows[0].cells[i], "1E293B") # Dark slate
        pin_table.rows[0].cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255,255,255)
        pin_table.rows[0].cells[i].paragraphs[0].runs[0].font.size = Pt(9)
        set_cell_margins(pin_table.rows[0].cells[i], 80, 80, 80, 80)

    pins_data = [
        ("Cảm biến Đất", "Chân AOUT (Analog)", "GPIO 34 (ADC1_CH6)", "Đo điện áp đất, không bị nhiễu Wi-Fi (ADC1)"),
        ("Cảm biến Mưa", "Chân AOUT / DOUT", "GPIO 35 (ADC1_CH7)", "Mưa ướt tấm cảm ứng -> giảm điện áp analog"),
        ("Cảm biến DHT22", "Chân DATA", "GPIO 19 (Digital)", "Đọc nhiệt độ/độ ẩm, cần trở treo 4.7k-10k lên 3V3"),
        ("Relay Bơm", "Chân IN", "GPIO 26 (Output)", "Kích Relay đóng tiếp điểm COM-NO cấp điện cho bơm"),
        ("Màn hình LCD", "SDA, SCL", "GPIO 21 (SDA), GPIO 22 (SCL)", "Giao tiếp I2C hiển thị thông số LCD 1602"),
        ("Đèn LED & Nút", "LED Mưa, Nút nhấn", "GPIO 27 (LED), GPIO 33 (Button)", "Đèn LED đỏ sáng khi mưa, nút bấm tưới tay")
    ]

    for r_idx, row in enumerate(pins_data, start=1):
        for c_idx in range(4):
            c = pin_table.rows[r_idx].cells[c_idx]
            p = c.paragraphs[0]
            r = p.add_run(row[c_idx])
            r.font.size = Pt(9)
            set_cell_margins(c, 60, 60, 60, 60)
            if c_idx == 2:
                r.bold = True
                r.font.color.rgb = RGBColor(2, 132, 199)

    doc.add_paragraph().paragraph_format.space_after = Pt(14)

    # 6. Safety & Tips
    h5 = doc.add_paragraph()
    r_h5 = h5.add_run("IV. 4 LƯU Ý SỐNG CÒN TRÁNH CHÁY CHIP & HƯ HỎNG LINH KIỆN")
    r_h5.bold = True
    r_h5.font.size = Pt(12)
    r_h5.font.color.rgb = RGBColor(185, 28, 28) # Red

    tips = [
        ("1. Bắt buộc lắp Diode 1N4007 dập xung ngược cho máy bơm:", 
         "Khi máy bơm ngắt điện đột ngột, cuộn dây motor sẽ phóng ra một xung điện cảm ứng ngược lên tới 50V - 100V. Cần mắc 1 con diode 1N4007 song song ngược cực với máy bơm (vạch trắng nối cực Dương +, đuôi đen nối cực Âm -) để triệt tiêu hoàn toàn tia lửa điện, tránh làm đơ hoặc cháy chip ESP32."),
        ("2. Chọn cảm biến độ ẩm đất ĐIỆN DUNG (Capacitive) thay vì Điện trở:", 
         "Loại cảm biến điện trở 2 que kim loại rẻ tiền sẽ bị ăn mòn rỉ sét chỉ sau 2-3 ngày cắm trong đất ướt do hiện tượng điện phân. Cảm biến điện dung có lớp sơn bảo vệ chống ăn mòn, tuổi thọ kéo dài nhiều tháng."),
        ("3. Không cấp nhầm nguồn 5V vào chân tín hiệu 3.3V của ESP32:", 
         "ESP32 hoạt động ở mức logic 3.3V. Cảm biến độ ẩm đất và DHT22 nên cấp nguồn 3.3V (hoặc nếu cấp 5V thì phải đảm bảo chân tín hiệu ra không vượt quá 3.3V)."),
        ("4. Đặt mua tại 1 địa chỉ để tiết kiệm phí vận chuyển:", 
         "Tất cả linh kiện trên đều có sẵn tại cửa hàng Thế Giới IC (Website: thegioiic.com). Hãy tạo tài khoản, thêm tất cả vào 1 giỏ hàng để chỉ tốn 1 lần phí ship giao hàng tận nơi (hoặc ghé trực tiếp cửa hàng tại TP. Thủ Đức để nhận ngay).")
    ]

    for title, desc in tips:
        tp = doc.add_paragraph()
        tp.paragraph_format.space_after = Pt(4)
        t_run = tp.add_run(f"⚠ {title}\n")
        t_run.bold = True
        t_run.font.size = Pt(10)
        t_run.font.color.rgb = RGBColor(153, 27, 27)
        d_run = tp.add_run(desc)
        d_run.font.size = Pt(9.5)
        d_run.font.color.rgb = RGBColor(51, 65, 85)

    # Footer note
    doc.add_paragraph().paragraph_format.space_after = Pt(10)
    fp = doc.add_paragraph()
    fp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    fr = fp.add_run("Tài liệu xuất tự động phục vụ đồ án môn học IoT • Tháng 10/2026")
    fr.italic = True
    fr.font.size = Pt(8.5)
    fr.font.color.rgb = RGBColor(148, 163, 184)

    doc.save(output_path)
    print(f"BOM Word document generated successfully at: {output_path}")

if __name__ == "__main__":
    out_file = r"d:\HeThongTuoiTuDong\TuoiCayThongMinh\docs\BANG_BAO_GIA_LINH_KIEN_THUC_TE_THEGIOIIC.docx"
    create_bom_document(out_file)
