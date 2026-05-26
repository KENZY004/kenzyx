import java.util.*;

public class Solution {
    static boolean dfs(char[][] board, String word, int i, int j, int k, int m, int n) {
        if (k == word.length()) return true;
        if (i < 0 || j < 0 || i >= m || j >= n || board[i][j] != word.charAt(k))
            return false;
        char temp = board[i][j];
        board[i][j] = '#';
        boolean found = dfs(board, word, i + 1, j, k + 1, m, n) ||
                        dfs(board, word, i - 1, j, k + 1, m, n) ||
                        dfs(board, word, i, j + 1, k + 1, m, n) ||
                        dfs(board, word, i, j - 1, k + 1, m, n);
        board[i][j] = temp;
        return found;
    }
    public static void main(String[] args) {
        Scanner sc = new Scanner("3 4\nABCE\nSFCS\nADEE\nABCCED");
        int m = sc.nextInt();
        int n = sc.nextInt();
        char[][] board = new char[m][n];
        for (int i = 0; i < m; i++) {
            String row = sc.next();
            for (int j = 0; j < n; j++) {
                board[i][j] = row.charAt(j);
            }
        }
        String word = sc.next();
        for (int i = 0; i < m; i++) {
            for (int j = 0; j < n; j++) {
                if (dfs(board, word, i, j, 0, m, n)) {
                    System.out.println("true");
                    return;
                }
            }
        }
        System.out.println("false");
    }
}
