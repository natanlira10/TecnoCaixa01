# Produtos cadastrados automaticamente na primeira vez que o site roda
# (quando a tabela "produto" do banco ainda está vazia).
#
# São os produtos que têm foto na pasta static/Fotos.
# Quantidade, estoque mínimo, preços e local são valores de exemplo.

PRODUTOS_INICIAIS = [
    # Computadores
    {"sku": "PC-001", "nome": "PC Gamer Flagship Valkyrie Olympus Extreme 4K", "categoria": "Computadores", "quantidade": 3, "minimo": 2, "custo": 18000.00, "preco": 23999.90, "local": "Galpão A1"},
    {"sku": "PC-002", "nome": "Console Portátil PC Gamer Valkyrie Nomad X Handheld", "categoria": "Computadores", "quantidade": 6, "minimo": 3, "custo": 3800.00, "preco": 4999.90, "local": "Galpão A2"},

    # Monitores
    {"sku": "MN-001", "nome": "Monitor Gamer Veloce Display Pulse 24G 24pol IPS FHD 144Hz 1ms", "categoria": "Monitores", "quantidade": 12, "minimo": 4, "custo": 650.00, "preco": 899.90, "local": "Galpão B1"},
    {"sku": "MN-002", "nome": "Monitor Gamer Veloce Display Arena 25X 25pol Fast IPS FHD 240Hz 0.5ms", "categoria": "Monitores", "quantidade": 7, "minimo": 3, "custo": 1100.00, "preco": 1499.90, "local": "Galpão B1"},
    {"sku": "MN-003", "nome": "Monitor Gamer Veloce Display CrystalQ 27 27pol Fast IPS QHD 180Hz 1ms", "categoria": "Monitores", "quantidade": 5, "minimo": 3, "custo": 1400.00, "preco": 1899.90, "local": "Galpão B2"},
    {"sku": "MN-004", "nome": "Monitor Gamer Veloce Display Lumina 27 QD-OLED 27pol QD-OLED Gen-3 QHD 360Hz 0.03ms", "categoria": "Monitores", "quantidade": 2, "minimo": 2, "custo": 4200.00, "preco": 5499.90, "local": "Galpão B2"},
    {"sku": "MN-005", "nome": "Monitor eSports Pro Veloce Display Z-Pro 25 UltraStrobing 24.5pol E-TN FHD 540Hz 0.2ms", "categoria": "Monitores", "quantidade": 1, "minimo": 2, "custo": 3900.00, "preco": 4999.90, "local": "Galpão B3"},

    # Peças
    {"sku": "PE-001", "nome": "Processador AMD Ryzen 5 5600", "categoria": "Peças", "quantidade": 20, "minimo": 6, "custo": 650.00, "preco": 849.90, "local": "Armário C1"},
    {"sku": "PE-002", "nome": "Processador AMD Ryzen 5 7600X", "categoria": "Peças", "quantidade": 9, "minimo": 4, "custo": 1150.00, "preco": 1499.90, "local": "Armário C1"},
    {"sku": "PE-003", "nome": "Placa-Mãe Kronos Hardware B550M Titan VRM", "categoria": "Peças", "quantidade": 8, "minimo": 3, "custo": 700.00, "preco": 949.90, "local": "Armário C2"},
    {"sku": "PE-004", "nome": "Placa-Mãe Kronos Hardware B650M Vanguard WiFi", "categoria": "Peças", "quantidade": 4, "minimo": 3, "custo": 1100.00, "preco": 1449.90, "local": "Armário C2"},
    {"sku": "PE-005", "nome": "Placa de Vídeo Flagship Kronos Hardware GeForce RTX 5090 Hall of Fame Extreme 32GB GDDR7 512-bit", "categoria": "Peças", "quantidade": 2, "minimo": 1, "custo": 16000.00, "preco": 19999.90, "local": "Cofre D1"},
    {"sku": "PE-006", "nome": "Fonte Kronos Hardware VoltMaster 850W 80 Plus Gold Full Modular ATX 3.1", "categoria": "Peças", "quantidade": 10, "minimo": 4, "custo": 600.00, "preco": 799.90, "local": "Armário C3"},
    {"sku": "PE-007", "nome": "Water Cooler Kronos Hardware HydroVision 360 Pro LCD IPS 2.8pol 360mm ARGB", "categoria": "Peças", "quantidade": 3, "minimo": 3, "custo": 850.00, "preco": 1199.90, "local": "Armário C3"},
    {"sku": "PE-008", "nome": "Kit Memória RAM Nexus Core Stealth 16GB (2x8GB) DDR4 3200MHz CL16", "categoria": "Peças", "quantidade": 16, "minimo": 5, "custo": 220.00, "preco": 319.90, "local": "Armário C4"},
    {"sku": "PE-009", "nome": "Kit Memória RAM Nexus Core Prism RGB 32GB (2x16GB) DDR5 6000MHz CL30", "categoria": "Peças", "quantidade": 10, "minimo": 4, "custo": 720.00, "preco": 999.90, "local": "Armário C4"},
    {"sku": "PE-010", "nome": "Kit Memória RAM Nexus Core Titanium Pro 64GB (2x32GB) DDR5 6400MHz CL32", "categoria": "Peças", "quantidade": 4, "minimo": 2, "custo": 1400.00, "preco": 1899.90, "local": "Armário C4"},
    {"sku": "PE-011", "nome": "SSD Nexus Core Velocity E4 1TB M.2 NVMe PCIe 4.0", "categoria": "Peças", "quantidade": 18, "minimo": 6, "custo": 330.00, "preco": 469.90, "local": "Armário C5"},
    {"sku": "PE-012", "nome": "SSD Nexus Core HyperDrive Pro 2TB M.2 NVMe PCIe 4.0 + DRAM", "categoria": "Peças", "quantidade": 8, "minimo": 3, "custo": 780.00, "preco": 1099.90, "local": "Armário C5"},
    {"sku": "PE-013", "nome": "SSD Flagship Nexus Core WarpSpeed Gen5 2TB M.2 NVMe PCIe 5.0", "categoria": "Peças", "quantidade": 3, "minimo": 2, "custo": 1550.00, "preco": 2199.90, "local": "Cofre D2"},
    {"sku": "PE-014", "nome": "Gabinete Gamer Kronos Hardware CrystalView Panoramic Dual-Chamber Mid-Tower Aquário", "categoria": "Peças", "quantidade": 7, "minimo": 3, "custo": 490.00, "preco": 699.90, "local": "Galpão A3"},
    {"sku": "PE-015", "nome": "Gabinete Gamer Kronos Hardware WindStorm Mesh Airflow + 4 Fans 140mm ARGB", "categoria": "Peças", "quantidade": 11, "minimo": 4, "custo": 340.00, "preco": 479.90, "local": "Galpão A3"},

    # Periféricos
    {"sku": "PF-001", "nome": "Mouse Gamer Sem Fio Aether Labs FeatherLight X Pro 8K Carbon", "categoria": "Periféricos", "quantidade": 15, "minimo": 5, "custo": 450.00, "preco": 649.90, "local": "Prateleira E1"},
    {"sku": "PF-002", "nome": "Webcam Profissional VoxStudio ClearVision 4K60 AI Gimbal HDR", "categoria": "Periféricos", "quantidade": 4, "minimo": 2, "custo": 1300.00, "preco": 1799.90, "local": "Prateleira E1"},
    {"sku": "PF-003", "nome": "Headset Sem Fio VoxStudio NovaPlanar Pro Wireless ANC + Hot-Swap Battery", "categoria": "Periféricos", "quantidade": 5, "minimo": 2, "custo": 1350.00, "preco": 1899.90, "local": "Prateleira E2"},
    {"sku": "PF-004", "nome": "Headset Gamer VoxStudio CloudCore V2 7.1 Surround USB", "categoria": "Periféricos", "quantidade": 14, "minimo": 5, "custo": 260.00, "preco": 379.90, "local": "Prateleira E2"},
    {"sku": "PF-005", "nome": "Fone In-Ear Monitor (IEM) Gamer & Audiófilo VoxStudio AriaStage Hexa Hybrid", "categoria": "Periféricos", "quantidade": 9, "minimo": 3, "custo": 350.00, "preco": 499.90, "local": "Prateleira E3"},
    {"sku": "TC-001", "nome": "Teclado Mecânico Gamer Aether Labs Phantom 60 Mini RGB", "categoria": "Periféricos", "quantidade": 18, "minimo": 6, "custo": 220.00, "preco": 299.90, "local": "Prateleira F1"},
    {"sku": "TC-002", "nome": "Teclado Mecânico Gamer Aether Labs Imperium 100 Full-Size RGB", "categoria": "Periféricos", "quantidade": 11, "minimo": 5, "custo": 320.00, "preco": 449.90, "local": "Prateleira F1"},
    {"sku": "TC-003", "nome": "Teclado Mecânico Custom Aether Labs NovaKey 65 Wireless Gasket", "categoria": "Periféricos", "quantidade": 6, "minimo": 3, "custo": 480.00, "preco": 649.90, "local": "Prateleira F2"},
    {"sku": "TC-004", "nome": "Teclado Mecânico Custom Aether Labs Aether 75 Pro TFT & Knob", "categoria": "Periféricos", "quantidade": 4, "minimo": 3, "custo": 650.00, "preco": 899.90, "local": "Prateleira F2"},
    {"sku": "TC-005", "nome": "Teclado Mecânico Low-Profile Aether Labs Vortex 70 Air Ultra-Slim QMK-VIA", "categoria": "Periféricos", "quantidade": 7, "minimo": 3, "custo": 520.00, "preco": 699.90, "local": "Prateleira F3"},
    {"sku": "TC-006", "nome": "Teclado Mecânico Wireless Aether Labs Chronos 96 Pro Silent Master", "categoria": "Periféricos", "quantidade": 5, "minimo": 3, "custo": 560.00, "preco": 749.90, "local": "Prateleira F3"},
    {"sku": "TC-007", "nome": "Teclado Magnético Gamer Aether Labs Pulse 60 HE Pro Rapid Trigger", "categoria": "Periféricos", "quantidade": 9, "minimo": 4, "custo": 600.00, "preco": 799.90, "local": "Prateleira F4"},
    {"sku": "TC-008", "nome": "Teclado Magnético Gamer Aether Labs Valkyrie 75 HE 8K Wireless", "categoria": "Periféricos", "quantidade": 3, "minimo": 3, "custo": 900.00, "preco": 1199.90, "local": "Prateleira F4"},
    {"sku": "TC-009", "nome": "Teclado Magnético Aether Labs Spectre 70 HE Alumínio CNC", "categoria": "Periféricos", "quantidade": 2, "minimo": 2, "custo": 1300.00, "preco": 1699.90, "local": "Prateleira F5"},
    {"sku": "TC-010", "nome": "Teclado Óptico Gamer Aether Labs Titan TKL 80 eSports 8K", "categoria": "Periféricos", "quantidade": 8, "minimo": 4, "custo": 700.00, "preco": 949.90, "local": "Prateleira F5"},
]

# O nome de cada produto é igual ao nome do arquivo da foto
for produto in PRODUTOS_INICIAIS:
    produto["foto"] = "Fotos/" + produto["nome"] + ".jpg"
