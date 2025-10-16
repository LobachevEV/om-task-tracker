namespace OneMoreTaskTracker.Users.Data;

public class User
{
    public int Id { get; init; }
    public required string Email { get; init; }
    public required string PasswordHash { get; set; }
    public required string Role { get; set; }
    public int? ManagerId { get; set; }
    public User? Manager { get; init; }
    public List<User> TeamMembers { get; init; } = [];
}
