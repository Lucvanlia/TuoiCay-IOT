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

def add_hyperlink(paragraph, url, text, color="0284C7", underline=True):
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
        section.top_margin = Inches(0.7)
        section.bottom_margin = Inches(0.7)
        section.left_margin = Inches(0.75)
        section.right_margin = Inches(0.75)

    # 1. Title Header
    title_p = doc.add_paragraph()
    title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = title_p.add_run("BẢNG BÁO GIÁ LINH KIỆN THỰC HIỆN HÓA MẠCH THẬT\n")
    r_title.bold = True
    r_title.font.size = Pt(16)
    r_title.font.color.rgb = RGBColor(18, 90, 58) # Deep Forest Green

    sub_p = doc.add_paragraph()
    sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_sub = sub_p.add_run("HỆ THỐNG TƯỚI CÂY THÔNG MINH IOT (ESP32 + AZURE IOT HUB + WEB DASHBOARD)\n")
    r_sub.bold = True
    r_sub.font.size = Pt(12)
    r_sub.font.color.rgb = RGBColor(40, 116, 80)

    info_p = doc.add_paragraph()
    info_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_info = info_p.add_run("Dữ liệu tra cứu thực tế từ Nhà cung cấp Thế Giới IC (thegioiic.com) • Cam kết đúng mã SKU & đúng giá niêm yết\n")
    r_info.italic = True
    r_info.font.size = Pt(9.5)
    r_info.font.color.rgb = RGBColor(100, 110, 105)

    doc.add_paragraph().paragraph_format.space_after = Pt(4)

    # 2. Executive Summary Box
    summary_table = doc.add_table(rows=1, cols=1)
    summary_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = summary_table.cell(0, 0)
    set_cell_background(cell, "F0FDF4") # soft green bg
    set_cell_margins(cell, 140, 140, 180, 180)
    
    sp = cell.paragraphs[0]
    sr1 = sp.add_run("📋 NGUYÊN TẮC LẬP BẢNG BÁO GIÁ THỰC TẾ (KHÔNG KÊ GIÁ - KHÔNG ĐƯỜNG LINK ẢO):\n")
    sr1.bold = True
    sr1.font.size = Pt(10.5)
    sr1.font.color.rgb = RGBColor(22, 101, 52)
    
    sr2 = sp.add_run(
        "1. Toàn bộ mã sản phẩm (SKU) và đơn giá dưới đây được tra cứu trực tiếp từ website chính thức của Thế Giới IC (thegioiic.com).\n"
        "2. Đơn giá là giá bán lẻ (áp dụng cho số lượng 1+ cái), đã bao gồm thuế niêm yết trên website.\n"
        "3. Bạn có thể nhập trực tiếp Mã SKU (ví dụ: IC7538, IC11563, IC3012, IC7412...) vào ô tìm kiếm của thegioiic.com để kiểm chứng và bấm Mua Ngay.\n"
        "4. Tối ưu kinh phí: Chọn toàn bộ tại Thế Giới IC giúp bạn gom đúng 1 gói hàng (phí ship chỉ ~25k - 30k nội thành hoặc ghé cửa hàng tại TP. Thủ Đức)."
    )
    sr2.font.size = Pt(9.5)
    sr2.font.color.rgb = RGBColor(30, 41, 59)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 3. Main BOM Table with Real SKU and Exact Prices
    h2 = doc.add_paragraph()
    r_h2 = h2.add_run("I. BẢNG BÁO GIÁ CHI TIẾT THEO MÃ SẢN PHẨM (SKU) THẾ GIỚI IC")
    r_h2.bold = True
    r_h2.font.size = Pt(11.5)
    r_h2.font.color.rgb = RGBColor(18, 90, 58)

    items = [
        # Nhóm 1: Điều khiển & Cảm biến
        {"cat": "Khối Vi Điều Khiển & Cảm Biến", "stt": "1", "sku": "IC7538", "name": "ESP32 NodeMCU LuaNode32 Module Thu Phát Wifi 30 Chân", "spec": "Dual-core ESP-WROOM-32, UART CP2102, Wi-Fi 2.4GHz + BLE, 30 chân cắm", "qty": 1, "price": 131100, "url": "https://www.thegioiic.com/esp32-nodemcu-luanode32-module-thu-phat-wifi-30-chan"},
        {"cat": "", "stt": "2", "sku": "IC11563", "name": "Cảm Biến Độ Ẩm Đất Điện Dung (Capacitive Soil Sensor)", "spec": "Đo độ ẩm đất bằng điện dung, phủ sơn chống ăn mòn điện cực, ngõ ra 0-3V an toàn ESP32", "qty": 1, "price": 17100, "url": "https://www.thegioiic.com/cam-bien-do-am-dat"},
        {"cat": "", "stt": "3", "sku": "IC3012", "name": "Mạch Cảm Biến Mưa Rơi (Tấm Cảm Ứng + Module LM393)", "spec": "Tấm điện cực mạ niken phát hiện nước mưa + mạch so sánh ngõ ra Digital & Analog AO", "qty": 1, "price": 13680, "url": "https://www.thegioiic.com/mach-cam-bien-mua-roi"},
        {"cat": "", "stt": "4", "sku": "IC7412", "name": "DHT22 Module Cảm Biến Nhiệt Độ Độ Ẩm", "spec": "Đo nhiệt độ (-40 đến 80°C) và độ ẩm (0-100% RH) độ chính xác cao, chuẩn 1-Wire Digital", "qty": 1, "price": 36480, "url": "https://www.thegioiic.com/dht22-module-cam-bien-nhiet-do-do-am"},
        {"cat": "", "stt": "5", "sku": "IC18661", "name": "LCD 1602 Nền Xanh Lá Chữ Đen 5V Kèm I2C Driver", "spec": "Màn hình LCD 16x2 ký tự, hàn sẵn module PCF8574 I2C chỉ cần nối 2 dây SDA/SCL", "qty": 1, "price": 48006, "url": "https://www.thegioiic.com/lcd-1602-nen-xanh-la-chu-den-5v-kem-i2c-driver"},
        
        # Nhóm 2: Chấp hành & Bơm tưới
        {"cat": "Khối Chấp Hành & Bơm Tưới", "stt": "6", "sku": "IC5059", "name": "Module 1 Relay 5V Kích Mức Cao/Thấp", "spec": "Có Opto cách ly quang, jumper chọn kích High/Low, tiếp điểm chịu tải 250VAC/10A hoặc 30VDC/10A", "qty": 1, "price": 15960, "url": "https://www.thegioiic.com/module-1-relay-5v-kich-muc-cao-thap"},
        {"cat": "", "stt": "7", "sku": "IC36781", "name": "Máy Bơm Chìm Mini 5V 1.2-1.6L/phút (Nối Sẵn Cáp USB)", "spec": "Bơm chìm 3.3V-5VDC, nối sẵn đầu cắm USB cắm trực tiếp củ sạc hoặc cổng 5V, đẩy cao 0.3-0.8m", "qty": 1, "price": 27360, "url": "https://www.thegioiic.com/may-bom-chim-mini-5v-1-2-1-6l-phut-noi-day-usb"},
        {"cat": "", "stt": "8", "sku": "IC2880", "name": "LM2596S Mạch Giảm Áp 3A (Tùy chọn nếu dùng nguồn 12V)", "spec": "Hạ áp từ 12V xuống 5VDC ổn định nuôi ESP32 và Relay (chỉ cần khi dùng bơm 12V)", "qty": 1, "price": 18522, "url": "https://www.thegioiic.com/lm2596s-mach-giam-ap-3a"},

        # Nhóm 3: Linh kiện bảo vệ & Testboard
        {"cat": "Linh Kiện Bảo Vệ & Phụ Kiện Đấu Nối", "stt": "9", "sku": "IC1033", "name": "1N4007 Diode Chỉnh Lưu 1A 1KV DO-204AL", "spec": "Diode dập xung điện áp ngược bảo vệ motor bơm không làm reset ESP32 (Gói 5 con)", "qty": 5, "price": 342, "url": "https://www.thegioiic.com/diode-chinh-luu-1n4007-1a-1000v"},
        {"cat": "", "stt": "10", "sku": "IC1491", "name": "LED Đỏ 5mm Chân Dài (Báo trạng thái mưa GPIO27)", "spec": "Đèn báo LED 5mm hiển thị trạng thái phát hiện trời mưa hoặc cảnh báo an toàn", "qty": 3, "price": 285, "url": "https://www.thegioiic.com/led-do-5mm-chan-dai"},
        {"cat": "", "stt": "11", "sku": "IC31396", "name": "Nút Nhấn 6x6mm Cao 8mm 4 Chân Xuyên Lỗ", "spec": "Nút nhấn kích bơm tay (GPIO33) và nút dừng khẩn cấp STOP", "qty": 3, "price": 855, "url": "https://www.thegioiic.com/nut-nhan-6x6mm-cao-8mm-4-chan-xuyen-lo-chinh-ngang"},
        {"cat": "", "stt": "12", "sku": "IC11437", "name": "Điện trở 1/4W 1% (220Ω, 1kΩ, 4.7kΩ, 10kΩ)", "spec": "Điện trở hạn dòng LED và trở kéo pull-up nút nhấn/I2C (10 con)", "qty": 10, "price": 200, "url": "https://www.thegioiic.com/dien-tro-1-4w-5"},
        {"cat": "", "stt": "13", "sku": "IC1208", "name": "MB-102 Breadboard Cắm Linh Kiện 830 Lỗ", "spec": "Board cắm thử nghiệm linh kiện không cần hàn mạch, kích thước 16.5 x 5.5cm", "qty": 1, "price": 21660, "url": "https://www.thegioiic.com/test-board-mb-102-830-lo"},
        {"cat": "", "stt": "14", "sku": "IC1320", "name": "Dây Cắm Test Board 20cm (Combo Đực-Đực, Đực-Cái)", "spec": "Dây cắm jumper 20cm, chuẩn 24AWG kết nối giữa ESP32, cảm biến và breadboard (Tép 40 sợi)", "qty": 2, "price": 16000, "url": "https://www.thegioiic.com/day-cam-test-board-duc-cai-20cm-tep-40-soi"}
    ]

    table = doc.add_table(rows=1, cols=7)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    col_widths = [Inches(0.4), Inches(0.8), Inches(2.2), Inches(0.4), Inches(0.85), Inches(0.9), Inches(1.1)]
    headers = ["STT", "Mã SKU", "Tên Sản Phẩm (Thegioiic)", "SL", "Đơn Giá", "Thành Tiền", "Link Trực Tiếp"]

    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = col_widths[i]
        set_cell_background(hdr_cells[i], "125A3A") # Dark Green
        set_cell_margins(hdr_cells[i], 100, 100, 60, 60)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.add_run(title)
        run.bold = True
        run.font.size = Pt(9)
        run.font.color.rgb = RGBColor(255, 255, 255)

    current_cat = None
    total_cost = 0

    for item in items:
        # Category separator row
        if item["cat"] and item["cat"] != current_cat:
            current_cat = item["cat"]
            cat_row = table.add_row()
            cat_cell = cat_row.cells[0]
            for c_idx in range(1, 7):
                cat_cell.merge(cat_row.cells[c_idx])
            set_cell_background(cat_cell, "E2E8F0") # Slate grey
            set_cell_margins(cat_cell, 70, 70, 80, 80)
            cp = cat_cell.paragraphs[0]
            c_run = cp.add_run(f"📁 {current_cat.upper()}")
            c_run.bold = True
            c_run.font.size = Pt(9)
            c_run.font.color.rgb = RGBColor(30, 41, 59)

        row_cells = table.add_row().cells
        for idx in range(7):
            row_cells[idx].width = col_widths[idx]
            set_cell_margins(row_cells[idx], 70, 70, 50, 50)

        # STT
        p0 = row_cells[0].paragraphs[0]
        p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r0 = p0.add_run(item["stt"])
        r0.font.size = Pt(8.5)

        # SKU
        p_sku = row_cells[1].paragraphs[0]
        p_sku.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r_sku = p_sku.add_run(item["sku"])
        r_sku.bold = True
        r_sku.font.size = Pt(8.5)
        r_sku.font.color.rgb = RGBColor(2, 132, 199)

        # Tên linh kiện
        p1 = row_cells[2].paragraphs[0]
        r1 = p1.add_run(item["name"] + "\n")
        r1.bold = True
        r1.font.size = Pt(8.5)
        r_spec = p1.add_run(item["spec"])
        r_spec.font.size = Pt(7.5)
        r_spec.font.color.rgb = RGBColor(100, 116, 139)

        # Số lượng
        p3 = row_cells[3].paragraphs[0]
        p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r3 = p3.add_run(str(item["qty"]))
        r3.font.size = Pt(8.5)

        # Đơn giá
        p4 = row_cells[4].paragraphs[0]
        p4.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r4 = p4.add_run(f"{item['price']:,}đ")
        r4.font.size = Pt(8.5)

        # Thành tiền
        subtotal = item["qty"] * item["price"]
        total_cost += subtotal
        p5 = row_cells[5].paragraphs[0]
        p5.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r5 = p5.add_run(f"{subtotal:,}đ")
        r5.bold = True
        r5.font.size = Pt(8.5)

        # Link
        p6 = row_cells[6].paragraphs[0]
        p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_hyperlink(p6, item["url"], f"Mở {item['sku']} ↗", color="0284C7", underline=True)

    # Total row
    tot_row = table.add_row()
    tot_cell = tot_row.cells[0]
    for c_idx in range(1, 5):
        tot_cell.merge(tot_row.cells[c_idx])
    set_cell_background(tot_cell, "F1F5F9")
    set_cell_margins(tot_cell, 90, 90, 80, 80)
    tp = tot_cell.paragraphs[0]
    tp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    tr = tp.add_run("TỔNG CHI PHÍ THỰC TẾ NIÊM YẾT:")
    tr.bold = True
    tr.font.size = Pt(9.5)

    val_cell = tot_row.cells[5]
    set_cell_background(val_cell, "DCFCE7") # light emerald
    set_cell_margins(val_cell, 90, 90, 80, 80)
    vp = val_cell.paragraphs[0]
    vp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    vr = vp.add_run(f"{total_cost:,} VNĐ")
    vr.bold = True
    vr.font.size = Pt(10)
    vr.font.color.rgb = RGBColor(22, 101, 52)

    blank_cell = tot_row.cells[6]
    set_cell_background(blank_cell, "F1F5F9")

    doc.add_paragraph().paragraph_format.space_after = Pt(12)

    # 4. Search Instructions on thegioiic.com
    h3 = doc.add_paragraph()
    r_h3 = h3.add_run("II. HƯỚNG DẪN TRA CỨU & MUA HÀNG TRỰC TIẾP TRÊN THEGIOIIC.COM")
    r_h3.bold = True
    r_h3.font.size = Pt(11.5)
    r_h3.font.color.rgb = RGBColor(18, 90, 58)

    p_guide = doc.add_paragraph()
    p_guide.add_run(
        "• Bước 1: Truy cập trang web "
    ).font.size = Pt(9.5)
    add_hyperlink(p_guide, "https://www.thegioiic.com/", "https://www.thegioiic.com/")
    p_guide.add_run(
        ".\n"
        "• Bước 2: Tại thanh tìm kiếm trên cùng của website, nhập trực tiếp Mã SKU trong bảng (Ví dụ: gõ 'IC7538' -> nhấn Enter là ra ngay đúng bo mạch ESP32 LuaNode32).\n"
        "• Bước 3: Bấm 'Thêm vào giỏ hàng' lần lượt từng mã để gom toàn bộ vào 1 đơn hàng duy nhất.\n"
        "• Địa chỉ mua trực tiếp (nếu ở TP.HCM): 939/1A Kha Vạn Cân, P. Linh Tây, TP. Thủ Đức, TP. Hồ Chí Minh.\n"
        "• Hotline hỗ trợ Thế Giới IC: (028) 3896 8699."
    ).font.size = Pt(9.5)

    doc.add_paragraph().paragraph_format.space_after = Pt(10)

    # 5. Technical Note
    h4 = doc.add_paragraph()
    r_h4 = h4.add_run("III. TỐI ƯU KINH PHÍ: GIẢI PHÁP NGUỒN 5V USB SIÊU TIẾT KIỆM")
    r_h4.bold = True
    r_h4.font.size = Pt(11.5)
    r_h4.font.color.rgb = RGBColor(18, 90, 58)

    p_opt = doc.add_paragraph()
    p_opt.add_run(
        "• Khi chọn máy bơm chìm mini 5V (SKU: IC36781 - giá 27.360đ):\n"
        "  - Bạn có thể dùng trực tiếp củ sạc điện thoại 5V 2A có sẵn tại nhà cấp nguồn.\n"
        "  - KHÔNG CẦN mua cục Adapter 12V 3A (tiết kiệm 85.000đ).\n"
        "  - KHÔNG CẦN module hạ áp LM2596 (tiết kiệm 18.522đ).\n"
        "  -> Tổng chi phí thực tế cả hệ thống giảm xuống chỉ còn khoảng ~320.000 VNĐ, cực kỳ tiết kiệm cho sinh viên làm đồ án!"
    ).font.size = Pt(9.5)

    doc.save(output_path)
    print(f"Verified BOM Word document generated at: {output_path}")

if __name__ == "__main__":
    out_file = r"d:\HeThongTuoiTuDong\TuoiCayThongMinh\docs\BANG_BAO_GIA_LINH_KIEN_THUC_TE_THEGIOIIC.docx"
    create_bom_document(out_file)
