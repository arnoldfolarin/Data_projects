<?php
$host = 'db';
$user = 'office_user';
$pass = 'office_pass';
$db = 'office_tracker';

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>