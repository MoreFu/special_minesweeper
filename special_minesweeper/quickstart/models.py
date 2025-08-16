from django.db import models

# Create your models here.
from django.conf import settings
from django.db import models
from django.utils import timezone

from special_minesweeper.enums import Trap

class MinesweeperGame(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="minesweeper_games"
    )
    width = models.PositiveIntegerField()
    height = models.PositiveIntegerField()
    mines = models.PositiveIntegerField()

    board_state = models.JSONField(default=list)   # Entire board as JSON

    status = models.CharField(
        max_length=20,
        choices=[
            ("in_progress", "In Progress"),
            ("won", "Won"),
            ("lost", "Lost"),
        ],
        default="in_progress"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Game #{self.id} for {self.user.username} ({self.status})"

    def getValidNeighbors(self, row_index, col_index):
        cells = []
        for row in range(row_index - 1, row_index + 2):
            for col in range(col_index - 1, col_index + 2):
                if self.isValid(row, col) and (row, col) != (row_index, col_index):
                    cells.append((row, col))
        return cells
    
    def isValid(self, row, col):
        return row >= 0 and row < self.width and col >= 0 and col < self.height

    def countMines(self, row, col):
        count = 0
                
        for r, c in self.getValidNeighbors(row, col):
            if self.board_state[r][c]["value"] == "M":
                count += 1
        
        return count

    '''
    function: moveHelper
    ----------
    This is a recursive function that processes cells for one origin
    move. When a move is made on a cell that has no neighboring mines,
    all of the adjacent cells are recursively processed as well.
    '''
    def moveHelper(self, row, col):
        # process the current location
        self.board_state[row][col]["label"] = self.countMines(row, col)
        # base case
        if not self.board_state[row][col]["label"] == 0:
            return
            
        # recursive case: current location is empty -> process all neighbors        
        for r, c in self.getValidNeighbors(row, col):
            if not self.board_state[r][c]["value"] == "M" and self.board_state[r][c]["label"] == None:
                self.moveHelper(r, c)

    '''
    function: gameWon
    ----------
    Returns a boolean indicating if the current state of the board is
    a winning game.
    '''
    def gameWon(self):
        for row in range(self.width):
            for col in range(self.height):
                # if there is an uncovered blank space
                if self.board_state[row][col]["label"] == None and self.board_state[row][col]["value"] != 'M':
                    return False
        return True
    '''
    function: move
    ----------
    Perfoms a move on the given cell.
    '''
    def move(self, row, col):
        # if the given move results in a losing game
        if self.board_state[row][col]["value"] == "M":
            self.board_state[row][col]["label"] = "M"
            self.status = "lost"
            # return because there is no need to recurse
            return

        if self.board_state[row][col]["label"] == "?":
            self.trigger_trap(row, col)
            return

        self.moveHelper(row, col)
        
        # if the given move results in a winning game
        if self.gameWon():
            self.status = "won"

    def trigger_trap(self, row, col):
        trap_type = Trap[self.board_state[row][col]["value"]]
        self.board_state[row][col]["label"] = trap_type.name

        if (Trap.BLINDS == trap_type):
            # apply blinds to the entire row
            for c in range(self.width):
                self.board_state[row][c]["label"] = trap_type.name
        elif (Trap.FIRE == trap_type):
            # burn everything around the fire, mines will explode
            for r, c in self.getValidNeighbors(row, col):
                if self.board_state[r][c]["label"] == "F":
                    # skip if flagged
                    continue
                self.board_state[r][c]["label"] = trap_type.name
                if self.board_state[r][c]["value"] == "M":
                    self.status = "lost"

    def toggle_flag(self, row, col):
        if (self.board_state[row][col]["label"] != "F"):
            self.board_state[row][col]["label"] = "F"
        else:
            self.board_state[row][col]["label"] = None