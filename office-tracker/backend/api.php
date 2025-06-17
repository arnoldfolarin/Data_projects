<?php
include 'db_connect.php';
header('Content-Type: application/json');

// Create equipment table if not exists
$conn->query("CREATE TABLE IF NOT EXISTS equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    serial_number VARCHAR(50) UNIQUE,
    status ENUM('available', 'assigned', 'maintenance', 'retired') DEFAULT 'available',
    assigned_to VARCHAR(100),
    location VARCHAR(100),
    purchase_date DATE
)");

// REST API Endpoints
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $result = $conn->query("SELECT * FROM equipment");
    $equipment = [];
    while ($row = $result->fetch_assoc()) {
        $equipment[] = $row;
    }
    echo json_encode($equipment);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $stmt = $conn->prepare("INSERT INTO equipment 
        (name, category, serial_number, status, assigned_to, location, purchase_date) 
        VALUES (?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->bind_param("sssssss", 
        $data['name'], 
        $data['category'], 
        $data['serial_number'], 
        $data['status'], 
        $data['assigned_to'], 
        $data['location'], 
        $data['purchase_date']
    );
    
    if ($stmt->execute()) {
        echo json_encode(['id' => $stmt->insert_id]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to add equipment']);
    }
}
?>