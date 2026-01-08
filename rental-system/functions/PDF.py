import json

# 設定檔名：請將此處改為你那份 "無法讀取的檔案" 路徑
input_filename = 'C:\\Users\\User\\OneDrive\\桌面\\租賃合約_王子建_1766585715611.txt' 
output_filename = 'C:\\Users\\User\\OneDrive\\桌面\\restored_contract.pdf'

try:
    with open(input_filename, 'r', encoding='utf-8') as f:
        # 讀取檔案內容
        content = f.read()
        
        # 如果你的檔案結尾有包含你打字的 ",這是我的開頭" 或是其他非 JSON 雜訊，
        # 請確保檔案內只保留 {...} 格式的純 JSON 字串
        data = json.loads(content)

    # 這種格式通常 key 是 "0", "1", "2"... 我們需要依照順序取出 value
    # 確保按照索引順序排列 (雖然通常 JSON 不保證順序，但在這種 dump 中通常是連續的)
    sorted_keys = sorted(data.keys(), key=lambda x: int(x))
    
    # 取出所有數字並轉為 bytes
    byte_array = bytes([data[k] for k in sorted_keys])

    # 寫入成正常的 PDF
    with open(output_filename, 'wb') as f_out:
        f_out.write(byte_array)

    print(f"成功！已還原為: {output_filename}")

except Exception as e:
    print(f"錯誤: {e}")