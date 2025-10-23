PROJECT_NAME := dreamteam_quickfix
BUILD_DIR := build

.PHONY: tarball
tarball:
	mkdir -p $(BUILD_DIR)
	rm -rf $(BUILD_DIR)/$(PROJECT_NAME).tgz
	tar zcvf $(BUILD_DIR)/$(PROJECT_NAME).tgz --exclude-vcs --exclude ./${BUILD_DIR} .

.PHONY: clean
clean:
	rm -rf $(BUILD_DIR)

.PHONY: help
help:
	@echo "Available targets:"
	@echo "  tarball  - Create a tarball of the project"
	@echo "  clean    - Remove the build directory"
	@echo "  help     - Show this help message"
